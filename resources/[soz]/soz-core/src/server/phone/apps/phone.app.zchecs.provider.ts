import { Inject } from '@core/decorators/injectable';
import { Rpc } from '@core/decorators/rpc';
import { phone_zchecs_game, Prisma } from '@prisma/client';
import { Cron } from '@public/core/decorators/cron';
import { Tick } from '@public/core/decorators/tick';
import { Provider } from '@public/core/decorators/provider';
import { ClientEvent } from '@public/shared/event/client';
import { LeaderboardInterface } from '@public/shared/phone/apps/game';
import {
    computeEloDelta,
    hasClock,
    isValidZchecsPseudo,
    sanitizeZchecsPseudo,
    ZCHECS_HILL_SQUARES,
    ZCHECS_THREE_CHECK_TARGET,
    ZCHECS_TIME_CONTROLS,
    ZCHECS_DRAW_OFFER_TTL_MS,
    ZCHECS_ELO_START,
    ZCHECS_FARM_FACTOR,
    ZCHECS_FARM_THRESHOLD,
    ZCHECS_FARM_WINDOW_MS,
    ZCHECS_FINISHED_HISTORY,
    ZCHECS_LEADERBOARD_MIN_GAMES,
    ZCHECS_MAX_ACTIVE_GAMES,
    ZCHECS_QUEUE_TTL_MS,
    ZCHECS_REMINDER_MS,
    ZCHECS_START_FEN,
    ZCHECS_TIMEOUT_MS,
    ZchecsColor,
    ZchecsEloPoint,
    ZchecsEndReason,
    ZchecsGame,
    ZchecsMove,
    ZchecsMovePayload,
    ZchecsNotifyReason,
    ZchecsNewGameOptions,
    ZchecsProfile,
    ZchecsResult,
    ZchecsStatus,
    ZchecsTimeControl,
    ZchecsVariant,
} from '@public/shared/phone/apps/zchecs';
import { RpcServerEvent } from '@public/shared/rpc';
import { Chess } from 'chess.js';

import { Err, Ok, Result } from '../../../shared/result';
import { PrismaService } from '../../database/prisma.service';
import { PlayerService } from '../../player/player.service';
import { ServerStateService } from '../../server.state.service';

type EloRow = { identifier: string; pseudo: string | null; elo: number; wins: number; losses: number; draws: number };

const ACTIVE_STATUSES = ['PENDING', 'ACTIVE'];

@Provider()
export class PhoneAppZchecsProvider {
    @Inject(PrismaService)
    private readonly prismaService: PrismaService;

    @Inject(PlayerService)
    private readonly playerService: PlayerService;

    @Inject(ServerStateService)
    private readonly serverStateService: ServerStateService;

    /* ---------------------------------------------------------------- *
     *  Lecture
     * ---------------------------------------------------------------- */

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_GET_GAMES)
    public async getGames(source: number): Promise<ZchecsGame[]> {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return [];
        }

        const mine = [{ white_id: player.citizenid }, { black_id: player.citizenid }];

        // Deux requetes: les parties ouvertes ne doivent JAMAIS etre tronquees par
        // l'historique des parties terminees (une vieille invitation resterait invisible).
        const [open, finished] = await Promise.all([
            this.prismaService.phone_zchecs_game.findMany({
                where: { status: { in: ACTIVE_STATUSES }, OR: mine },
                orderBy: { last_move_at: 'desc' },
            }),
            this.prismaService.phone_zchecs_game.findMany({
                where: {
                    status: 'FINISHED',
                    OR: mine,
                    NOT: {
                        OR: [
                            { white_id: player.citizenid, hidden_by_white: true },
                            { black_id: player.citizenid, hidden_by_black: true },
                        ],
                    },
                },
                orderBy: { updatedAt: 'desc' },
                take: ZCHECS_FINISHED_HISTORY,
            }),
        ]);

        return Promise.all([...open, ...finished].map(game => this.toDto(game, player.citizenid)));
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_GET_PROFILE)
    public async getProfile(source: number): Promise<ZchecsProfile | null> {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return null;
        }

        const [elo, queue, ranking] = await Promise.all([
            this.getElo(player.citizenid),
            this.prismaService.phone_zchecs_queue.findUnique({ where: { identifier: player.citizenid } }),
            this.getRanking(player.citizenid),
        ]);

        return {
            pseudo: elo.pseudo ?? null,
            elo: elo.elo,
            wins: elo.wins,
            losses: elo.losses,
            draws: elo.draws,
            inQueue: Boolean(queue),
            rank: ranking.rank,
            totalRanked: ranking.total,
        };
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_GET_LEADERBOARD)
    public async getLeaderboard(): Promise<LeaderboardInterface[]> {
        const rows: any[] = await this.prismaService.$queryRaw(
            Prisma.sql`
                SELECT player.citizenid,
                       phone_profile.avatar,
                       -- Jamais le nom du personnage: on affiche le pseudo, a defaut le numero.
                       COALESCE(NULLIF(phone_zchecs_elo.pseudo, ''), JSON_VALUE(player.charinfo, '$.phone')) as player_name,
                       phone_zchecs_elo.elo                                                                              AS score,
                       (phone_zchecs_elo.wins + phone_zchecs_elo.losses + phone_zchecs_elo.draws)                         AS game_played
                FROM phone_zchecs_elo
                         LEFT JOIN player ON player.citizenid = phone_zchecs_elo.identifier
                         LEFT JOIN phone_profile ON JSON_VALUE(player.charinfo, '$.phone') = phone_profile.number
                WHERE player.citizenid IS NOT NULL
                  AND (phone_zchecs_elo.wins + phone_zchecs_elo.losses + phone_zchecs_elo.draws) >= ${ZCHECS_LEADERBOARD_MIN_GAMES}
                ORDER BY score DESC
                LIMIT 100
            `
        );

        return rows.map(row => ({
            citizenid: row.citizenid,
            avatar: row.avatar,
            player_name: row.player_name,
            score: Number(row.score),
            game_played: Number(row.game_played),
        }));
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_GET_HISTORY)
    public async getHistory(source: number): Promise<ZchecsEloPoint[]> {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return [];
        }

        const games = await this.prismaService.phone_zchecs_game.findMany({
            where: {
                status: 'FINISHED',
                ranked: true,
                NOT: { result: null },
                OR: [{ white_id: player.citizenid }, { black_id: player.citizenid }],
            },
            orderBy: { updatedAt: 'asc' },
            take: 50,
        });

        const points: ZchecsEloPoint[] = [];

        for (const game of games) {
            const isWhite = game.white_id === player.citizenid;
            const elo = isWhite ? game.white_elo_after : game.black_elo_after;
            const delta = isWhite ? game.white_elo_delta : game.black_elo_delta;

            // Les parties d'avant l'ajout des colonnes n'ont pas d'ELO historise.
            if (elo === null || delta === null) {
                continue;
            }

            const opponentElo = await this.getElo(isWhite ? game.black_id : game.white_id);
            const opponentNumber = isWhite ? game.black_number : game.white_number;

            points.push({
                at: game.updatedAt.getTime(),
                elo,
                delta,
                opponentName: opponentElo.pseudo || opponentNumber,
                result: game.result as ZchecsResult,
            });
        }

        return points;
    }

    /* ---------------------------------------------------------------- *
     *  Creation de partie amicale
     * ---------------------------------------------------------------- */

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_CREATE)
    public async createGame(source: number, options: ZchecsNewGameOptions): Promise<Result<ZchecsGame, string>> {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return Err('Joueur introuvable');
        }

        const number = (options?.number || '').trim();
        const timeControl = this.sanitizeTimeControl(options?.timeControl);
        const variant = this.sanitizeVariant(options?.variant);
        const clock = ZCHECS_TIME_CONTROLS[timeControl];

        if (number === player.charinfo.phone) {
            return Err('Impossible de se defier soi-meme');
        }

        const targetCitizenId = await this.playerService.findCitizenIdFromPhone(number);

        if (!targetCitizenId) {
            return Err('Ce numero est introuvable');
        }

        const limit = await this.checkActiveLimit(player.citizenid);

        if (limit) {
            return Err(limit);
        }

        const iAmWhite = Math.random() < 0.5;
        const game = await this.prismaService.phone_zchecs_game.create({
            data: {
                white_id: iAmWhite ? player.citizenid : targetCitizenId,
                black_id: iAmWhite ? targetCitizenId : player.citizenid,
                creator_id: player.citizenid,
                white_number: iAmWhite ? player.charinfo.phone : number,
                black_number: iAmWhite ? number : player.charinfo.phone,
                ranked: false,
                status: 'PENDING',
                fen: ZCHECS_START_FEN,
                pgn: '',
                last_move_at: new Date(),
                time_control: timeControl,
                variant,
                increment_ms: clock.incrementMs,
                white_time_ms: clock.initialMs,
                black_time_ms: clock.initialMs,
            },
        });

        await this.pushGame(targetCitizenId, game, 'INVITE');

        return Ok(await this.toDto(game, player.citizenid));
    }

    /* ---------------------------------------------------------------- *
     *  File d'attente classee
     * ---------------------------------------------------------------- */

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_QUEUE_JOIN)
    public async joinQueue(source: number): Promise<Result<ZchecsGame | null, string>> {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return Err('Joueur introuvable');
        }

        const limit = await this.checkActiveLimit(player.citizenid);

        if (limit) {
            return Err(limit);
        }

        await this.purgeQueue();

        const myElo = await this.getElo(player.citizenid);
        const opponent = await this.prismaService.$transaction(async tx => {
            const candidates = await tx.phone_zchecs_queue.findMany({
                where: { identifier: { not: player.citizenid } },
                orderBy: { createdAt: 'asc' },
                take: 25,
            });

            if (candidates.length === 0) {
                await tx.phone_zchecs_queue.upsert({
                    where: { identifier: player.citizenid },
                    create: { identifier: player.citizenid, number: player.charinfo.phone },
                    update: { number: player.charinfo.phone },
                });

                return null;
            }

            // Appariement par niveau: on prend l'adversaire dont l'ELO est le plus proche.
            const elos = await tx.phone_zchecs_elo.findMany({
                where: { identifier: { in: candidates.map(candidate => candidate.identifier) } },
            });
            const eloByIdentifier = new Map(elos.map(row => [row.identifier, row.elo]));

            const sorted = [...candidates].sort((a, b) => {
                const eloA = eloByIdentifier.get(a.identifier) ?? ZCHECS_ELO_START;
                const eloB = eloByIdentifier.get(b.identifier) ?? ZCHECS_ELO_START;

                return Math.abs(eloA - myElo.elo) - Math.abs(eloB - myElo.elo);
            });

            for (const candidate of sorted) {
                // Le premier a retirer l'adversaire de la file remporte l'appariement.
                const removed = await tx.phone_zchecs_queue.deleteMany({
                    where: { identifier: candidate.identifier },
                });

                if (removed.count > 0) {
                    await tx.phone_zchecs_queue.deleteMany({ where: { identifier: player.citizenid } });

                    return candidate;
                }
            }

            return null;
        });

        if (!opponent) {
            return Ok(null);
        }

        const iAmWhite = Math.random() < 0.5;
        const game = await this.prismaService.phone_zchecs_game.create({
            data: {
                white_id: iAmWhite ? player.citizenid : opponent.identifier,
                black_id: iAmWhite ? opponent.identifier : player.citizenid,
                creator_id: player.citizenid,
                white_number: iAmWhite ? player.charinfo.phone : opponent.number,
                black_number: iAmWhite ? opponent.number : player.charinfo.phone,
                ranked: true,
                status: 'ACTIVE',
                fen: ZCHECS_START_FEN,
                pgn: '',
                last_move_at: new Date(),
            },
        });

        await this.pushGame(opponent.identifier, game, 'MATCHED');

        return Ok(await this.toDto(game, player.citizenid));
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_QUEUE_LEAVE)
    public async leaveQueue(source: number): Promise<boolean> {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return false;
        }

        await this.prismaService.phone_zchecs_queue.deleteMany({ where: { identifier: player.citizenid } });

        return true;
    }

    /* ---------------------------------------------------------------- *
     *  Invitation
     * ---------------------------------------------------------------- */

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_ACCEPT)
    public async acceptGame(source: number, id: number): Promise<Result<ZchecsGame, string>> {
        const player = this.playerService.getPlayer(source);
        const game = await this.loadGame(id, player?.citizenid);

        if (!player || !game) {
            return Err('Partie introuvable');
        }

        if (game.status !== 'PENDING') {
            return Err("Cette invitation n'est plus valide");
        }

        if (game.creator_id === player.citizenid) {
            return Err("En attente de la reponse de l'adversaire");
        }

        const updated = await this.prismaService.phone_zchecs_game.update({
            where: { id: game.id },
            data: { status: 'ACTIVE', last_move_at: new Date() },
        });

        await this.pushGame(this.getOpponentId(updated, player.citizenid), updated, 'MOVE');

        return Ok(await this.toDto(updated, player.citizenid));
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_DECLINE)
    public async declineGame(source: number, id: number): Promise<Result<ZchecsGame, string>> {
        const player = this.playerService.getPlayer(source);
        const game = await this.loadGame(id, player?.citizenid);

        if (!player || !game) {
            return Err('Partie introuvable');
        }

        if (game.status !== 'PENDING') {
            return Err("Cette invitation n'est plus valide");
        }

        // Une invitation refusee n'a pas de vainqueur et ne touche jamais a l'ELO.
        const updated = await this.finishGame(game, null, 'DECLINED');

        await this.pushGame(this.getOpponentId(updated, player.citizenid), updated, 'END');

        return Ok(await this.toDto(updated, player.citizenid));
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_SET_PSEUDO)
    public async setPseudo(source: number, value: string): Promise<Result<string, string>> {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return Err('Joueur introuvable');
        }

        const pseudo = sanitizeZchecsPseudo(value);

        if (!isValidZchecsPseudo(pseudo)) {
            return Err('Pseudo invalide (3 a 20 caracteres)');
        }

        await this.prismaService.phone_zchecs_elo.upsert({
            where: { identifier: player.citizenid },
            create: { identifier: player.citizenid, pseudo },
            update: { pseudo },
        });

        return Ok(pseudo);
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_HIDE)
    public async hideGame(source: number, id: number): Promise<Result<number, string>> {
        const player = this.playerService.getPlayer(source);
        const game = await this.loadGame(id, player?.citizenid);

        if (!player || !game) {
            return Err('Partie introuvable');
        }

        if (game.status !== 'FINISHED') {
            return Err('Seules les parties terminees peuvent etre masquees');
        }

        // Masquage par joueur: l'adversaire garde la partie dans son historique.
        await this.prismaService.phone_zchecs_game.update({
            where: { id: game.id },
            data:
                game.white_id === player.citizenid ? { hidden_by_white: true } : { hidden_by_black: true },
        });

        return Ok(game.id);
    }

    /* ---------------------------------------------------------------- *
     *  Deroulement de la partie
     * ---------------------------------------------------------------- */

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_MOVE)
    public async move(source: number, payload: ZchecsMovePayload): Promise<Result<ZchecsGame, string>> {
        const player = this.playerService.getPlayer(source);
        const game = await this.loadGame(payload?.id, player?.citizenid);

        if (!player || !game) {
            return Err('Partie introuvable');
        }

        if (game.status !== 'ACTIVE') {
            return Err("Cette partie n'est pas en cours");
        }

        const myColor = this.getColor(game, player.citizenid);
        const chess = this.replay(game);

        if (chess.turn() !== myColor) {
            return Err("Ce n'est pas ton tour");
        }

        // Le temps consomme depuis le dernier ping est retranche AVANT de valider le coup.
        const clock = this.settleClock(game);
        const clockEnabled = hasClock(game.time_control as ZchecsTimeControl);
        const myRemaining = myColor === 'w' ? clock.whiteMs : clock.blackMs;

        if (clockEnabled && myRemaining !== null && myRemaining <= 0) {
            const flagged = await this.flagGame(game, myColor, clock);
            await this.pushGame(this.getOpponentId(flagged, player.citizenid), flagged, 'END');

            return Err('Temps ecoule');
        }

        try {
            chess.move({ from: payload.from, to: payload.to, promotion: payload.promotion });
        } catch {
            return Err('Coup illegal');
        }

        // Un echec donne par le coup qu'on vient de jouer compte pour le triple echec.
        const gaveCheck = chess.inCheck();
        const whiteChecks = game.white_checks + (gaveCheck && myColor === 'w' ? 1 : 0);
        const blackChecks = game.black_checks + (gaveCheck && myColor === 'b' ? 1 : 0);

        // Les fins standard (mat, pat, nulles) priment sur les conditions de variante.
        const outcome =
            this.readOutcome(chess) ?? this.readVariantOutcome(game, chess, myColor, whiteChecks, blackChecks);

        const increment = clockEnabled ? game.increment_ms : 0;

        let updated = await this.prismaService.phone_zchecs_game.update({
            where: { id: game.id },
            data: {
                fen: chess.fen(),
                pgn: chess.pgn(),
                draw_offer_by: null,
                draw_offer_at: null,
                last_move_at: new Date(),
                white_checks: whiteChecks,
                black_checks: blackChecks,
                // Le trait change: la pendule de l'adversaire demarre tout de suite et
                // tournera en continu, telephone ferme ou joueur deconnecte.
                clock_since: clockEnabled ? new Date() : null,
                white_time_ms: clock.whiteMs === null ? null : clock.whiteMs + (myColor === 'w' ? increment : 0),
                black_time_ms: clock.blackMs === null ? null : clock.blackMs + (myColor === 'b' ? increment : 0),
            },
        });

        if (outcome) {
            updated = await this.finishGame(updated, outcome.result, outcome.reason);
        }

        await this.pushGame(this.getOpponentId(updated, player.citizenid), updated, outcome ? 'END' : 'MOVE');

        return Ok(await this.toDto(updated, player.citizenid));
    }

    /* ---------------------------------------------------------------- *
     *  Pendule
     * ---------------------------------------------------------------- */

    /**
     * Chute du drapeau. Un tick serveur est indispensable: le temps devant
     * s'ecouler meme quand les deux joueurs sont hors ligne, personne ne peut
     * declencher la fin de partie depuis le client.
     */
    @Tick(2000, 'zchecs:flags')
    public async checkFlags(): Promise<void> {
        // Ensemble minuscule: uniquement les parties en cours dont la pendule tourne.
        const games = await this.prismaService.phone_zchecs_game.findMany({
            where: { status: 'ACTIVE', NOT: { clock_since: null } },
        });

        for (const game of games) {
            if (!hasClock(game.time_control as ZchecsTimeControl)) {
                continue;
            }

            const clock = this.settleClock(game);
            const turn = this.getTurn(game.fen);
            const remaining = turn === 'w' ? clock.whiteMs : clock.blackMs;

            if (remaining === null || remaining > 0) {
                continue;
            }

            const flagged = await this.flagGame(game, turn, clock);

            await this.pushGame(flagged.white_id, flagged, 'END');
            await this.pushGame(flagged.black_id, flagged, 'END');
        }
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_RESIGN)
    public async resign(source: number, id: number): Promise<Result<ZchecsGame, string>> {
        const player = this.playerService.getPlayer(source);
        const game = await this.loadGame(id, player?.citizenid);

        if (!player || !game) {
            return Err('Partie introuvable');
        }

        if (game.status !== 'ACTIVE') {
            return Err("Cette partie n'est pas en cours");
        }

        const winner: ZchecsResult = this.getColor(game, player.citizenid) === 'w' ? 'BLACK' : 'WHITE';
        const updated = await this.finishGame(game, winner, 'RESIGN');

        await this.pushGame(this.getOpponentId(updated, player.citizenid), updated, 'END');

        return Ok(await this.toDto(updated, player.citizenid));
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_OFFER_DRAW)
    public async offerDraw(source: number, id: number): Promise<Result<ZchecsGame, string>> {
        const player = this.playerService.getPlayer(source);
        const game = await this.loadGame(id, player?.citizenid);

        if (!player || !game) {
            return Err('Partie introuvable');
        }

        if (game.status !== 'ACTIVE') {
            return Err("Cette partie n'est pas en cours");
        }

        if (this.hasLiveDrawOffer(game) && game.draw_offer_by === player.citizenid) {
            return Err('Proposition deja envoyee');
        }

        const updated = await this.prismaService.phone_zchecs_game.update({
            where: { id: game.id },
            data: { draw_offer_by: player.citizenid, draw_offer_at: new Date() },
        });

        await this.pushGame(this.getOpponentId(updated, player.citizenid), updated, 'DRAW_OFFER');

        return Ok(await this.toDto(updated, player.citizenid));
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_ANSWER_DRAW)
    public async answerDraw(source: number, id: number, accept: boolean): Promise<Result<ZchecsGame, string>> {
        const player = this.playerService.getPlayer(source);
        const game = await this.loadGame(id, player?.citizenid);

        if (!player || !game) {
            return Err('Partie introuvable');
        }

        if (game.status !== 'ACTIVE' || !this.hasLiveDrawOffer(game) || game.draw_offer_by === player.citizenid) {
            return Err('Aucune proposition de nulle a traiter');
        }

        const updated = accept
            ? await this.finishGame(game, 'DRAW', 'DRAW_AGREED')
            : await this.prismaService.phone_zchecs_game.update({
                  where: { id: game.id },
                  data: { draw_offer_by: null, draw_offer_at: null },
              });

        await this.pushGame(this.getOpponentId(updated, player.citizenid), updated, accept ? 'END' : 'MOVE');

        return Ok(await this.toDto(updated, player.citizenid));
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_CLAIM_TIMEOUT)
    public async claimTimeout(source: number, id: number): Promise<Result<ZchecsGame, string>> {
        const player = this.playerService.getPlayer(source);
        const game = await this.loadGame(id, player?.citizenid);

        if (!player || !game) {
            return Err('Partie introuvable');
        }

        if (game.status !== 'ACTIVE') {
            return Err("Cette partie n'est pas en cours");
        }

        const myColor = this.getColor(game, player.citizenid);

        if (this.getTurn(game.fen) === myColor) {
            return Err("C'est a toi de jouer");
        }

        if (Date.now() - game.last_move_at.getTime() < ZCHECS_TIMEOUT_MS) {
            return Err("Le delai d'inactivite n'est pas ecoule");
        }

        const winner: ZchecsResult = myColor === 'w' ? 'WHITE' : 'BLACK';
        const updated = await this.finishGame(game, winner, 'TIMEOUT');

        await this.pushGame(this.getOpponentId(updated, player.citizenid), updated, 'END');

        return Ok(await this.toDto(updated, player.citizenid));
    }

    /* ---------------------------------------------------------------- *
     *  Rappel quotidien avant forfait
     * ---------------------------------------------------------------- */

    @Cron(12)
    public async remindPendingPlayers(): Promise<void> {
        const now = Date.now();
        const games = await this.prismaService.phone_zchecs_game.findMany({
            where: {
                status: 'ACTIVE',
                last_move_at: {
                    lte: new Date(now - (ZCHECS_TIMEOUT_MS - ZCHECS_REMINDER_MS)),
                    gt: new Date(now - ZCHECS_TIMEOUT_MS),
                },
            },
        });

        for (const game of games) {
            // Le rappel va au joueur qui doit jouer: c'est lui qui risque le forfait.
            const turn = this.getTurn(game.fen);
            const citizenId = turn === 'w' ? game.white_id : game.black_id;

            await this.pushGame(citizenId, game, 'REMINDER');
        }
    }

    /* ---------------------------------------------------------------- *
     *  Interne
     * ---------------------------------------------------------------- */

    private sanitizeTimeControl(value?: string): ZchecsTimeControl {
        return value && value in ZCHECS_TIME_CONTROLS ? (value as ZchecsTimeControl) : 'CORRESPONDENCE';
    }

    private sanitizeVariant(value?: string): ZchecsVariant {
        const allowed: ZchecsVariant[] = ['STANDARD', 'KING_OF_THE_HILL', 'THREE_CHECK'];

        return allowed.includes(value as ZchecsVariant) ? (value as ZchecsVariant) : 'STANDARD';
    }

    /** Retranche au joueur au trait le temps ecoule depuis `clock_since`. Ne persiste rien. */
    private settleClock(game: phone_zchecs_game): { whiteMs: number | null; blackMs: number | null } {
        let whiteMs = game.white_time_ms;
        let blackMs = game.black_time_ms;

        if (!hasClock(game.time_control as ZchecsTimeControl) || !game.clock_since) {
            return { whiteMs, blackMs };
        }

        const consumed = Math.max(0, Date.now() - game.clock_since.getTime());

        if (this.getTurn(game.fen) === 'w') {
            whiteMs = Math.max(0, (whiteMs ?? 0) - consumed);
        } else {
            blackMs = Math.max(0, (blackMs ?? 0) - consumed);
        }

        return { whiteMs, blackMs };
    }

    /** Chute du drapeau: le joueur au trait a epuise son temps. */
    private async flagGame(
        game: phone_zchecs_game,
        loser: ZchecsColor,
        clock: { whiteMs: number | null; blackMs: number | null }
    ): Promise<phone_zchecs_game> {
        const settled = await this.prismaService.phone_zchecs_game.update({
            where: { id: game.id },
            data: { white_time_ms: clock.whiteMs, black_time_ms: clock.blackMs, clock_since: null },
        });

        return this.finishGame(settled, loser === 'w' ? 'BLACK' : 'WHITE', 'FLAG');
    }

    /** Conditions de victoire propres aux variantes, evaluees apres les fins standard. */
    private readVariantOutcome(
        game: phone_zchecs_game,
        chess: Chess,
        mover: ZchecsColor,
        whiteChecks: number,
        blackChecks: number
    ): { result: ZchecsResult; reason: ZchecsEndReason } | null {
        const variant = game.variant as ZchecsVariant;
        const winner: ZchecsResult = mover === 'w' ? 'WHITE' : 'BLACK';

        if (variant === 'THREE_CHECK') {
            const given = mover === 'w' ? whiteChecks : blackChecks;

            return given >= ZCHECS_THREE_CHECK_TARGET ? { result: winner, reason: 'THREE_CHECK' } : null;
        }

        if (variant === 'KING_OF_THE_HILL') {
            for (const row of chess.board()) {
                for (const cell of row) {
                    if (
                        cell &&
                        cell.type === 'k' &&
                        cell.color === mover &&
                        ZCHECS_HILL_SQUARES.includes(cell.square)
                    ) {
                        return { result: winner, reason: 'KING_OF_THE_HILL' };
                    }
                }
            }
        }

        return null;
    }

    private getTurn(fen: string): ZchecsColor {
        return (fen.split(' ')[1] as ZchecsColor) || 'w';
    }

    private getColor(game: phone_zchecs_game, citizenId: string): ZchecsColor {
        return game.white_id === citizenId ? 'w' : 'b';
    }

    private getOpponentId(game: phone_zchecs_game, citizenId: string): string {
        return game.white_id === citizenId ? game.black_id : game.white_id;
    }

    /**
     * Rejoue la partie depuis le PGN pour restaurer l'historique des positions.
     * Indispensable: reconstruire depuis la seule FEN rend `isThreefoldRepetition()`
     * toujours faux, la nulle par repetition ne serait jamais detectee.
     */
    private replay(game: phone_zchecs_game): Chess {
        const chess = new Chess();

        if (!game.pgn) {
            chess.load(game.fen);

            return chess;
        }

        try {
            chess.loadPgn(game.pgn);

            // Filet de securite: si le PGN ne mene pas a la position stockee, la FEN fait foi.
            if (chess.fen() !== game.fen) {
                chess.load(game.fen);
            }
        } catch {
            chess.load(game.fen);
        }

        return chess;
    }

    private hasLiveDrawOffer(game: phone_zchecs_game): boolean {
        if (!game.draw_offer_by) {
            return false;
        }

        if (!game.draw_offer_at) {
            return true;
        }

        return Date.now() - game.draw_offer_at.getTime() < ZCHECS_DRAW_OFFER_TTL_MS;
    }

    private async purgeQueue(): Promise<void> {
        await this.prismaService.phone_zchecs_queue.deleteMany({
            where: { createdAt: { lt: new Date(Date.now() - ZCHECS_QUEUE_TTL_MS) } },
        });
    }

    private async checkActiveLimit(citizenId: string): Promise<string | null> {
        const count = await this.prismaService.phone_zchecs_game.count({
            where: {
                status: { in: ACTIVE_STATUSES },
                OR: [{ white_id: citizenId }, { black_id: citizenId }],
            },
        });

        return count >= ZCHECS_MAX_ACTIVE_GAMES ? `Maximum ${ZCHECS_MAX_ACTIVE_GAMES} parties en cours` : null;
    }

    private async loadGame(id: number, citizenId?: string): Promise<phone_zchecs_game | null> {
        if (!id || !citizenId) {
            return null;
        }

        const game = await this.prismaService.phone_zchecs_game.findUnique({ where: { id } });

        // Un joueur ne peut agir que sur une partie dont il est l'un des deux camps.
        if (!game || (game.white_id !== citizenId && game.black_id !== citizenId)) {
            return null;
        }

        return game;
    }

    private readOutcome(chess: Chess): { result: ZchecsResult; reason: ZchecsEndReason } | null {
        if (!chess.isGameOver()) {
            return null;
        }

        if (chess.isCheckmate()) {
            // Apres le coup, le trait revient au camp mate.
            return { result: chess.turn() === 'w' ? 'BLACK' : 'WHITE', reason: 'CHECKMATE' };
        }

        if (chess.isStalemate()) {
            return { result: 'DRAW', reason: 'STALEMATE' };
        }

        if (chess.isInsufficientMaterial()) {
            return { result: 'DRAW', reason: 'DRAW_MATERIAL' };
        }

        if (chess.isThreefoldRepetition()) {
            return { result: 'DRAW', reason: 'DRAW_REPETITION' };
        }

        return { result: 'DRAW', reason: 'DRAW_50_MOVES' };
    }

    private async getElo(citizenId: string): Promise<EloRow> {
        const row = await this.prismaService.phone_zchecs_elo.findUnique({ where: { identifier: citizenId } });

        return row ?? { identifier: citizenId, pseudo: null, elo: ZCHECS_ELO_START, wins: 0, losses: 0, draws: 0 };
    }

    private async getRanking(citizenId: string): Promise<{ rank: number | null; total: number }> {
        const rows: any[] = await this.prismaService.$queryRaw(
            Prisma.sql`
                SELECT COUNT(*)                                                              AS total,
                       SUM(CASE WHEN identifier = ${citizenId} THEN 1 ELSE 0 END)            AS listed,
                       SUM(CASE
                               WHEN elo > (SELECT elo FROM phone_zchecs_elo WHERE identifier = ${citizenId})
                                   THEN 1
                               ELSE 0 END)                                                   AS above
                FROM phone_zchecs_elo
                WHERE (wins + losses + draws) >= ${ZCHECS_LEADERBOARD_MIN_GAMES}
            `
        );

        const row = rows[0];

        if (!row || Number(row.listed || 0) === 0) {
            return { rank: null, total: Number(row?.total || 0) };
        }

        return { rank: Number(row.above || 0) + 1, total: Number(row.total || 0) };
    }

    /** Nombre de parties classees terminees contre le meme adversaire sur la fenetre anti-farm. */
    private async countRecentRankedGames(game: phone_zchecs_game): Promise<number> {
        return this.prismaService.phone_zchecs_game.count({
            where: {
                id: { not: game.id },
                ranked: true,
                status: 'FINISHED',
                NOT: { result: null },
                updatedAt: { gte: new Date(Date.now() - ZCHECS_FARM_WINDOW_MS) },
                OR: [
                    { white_id: game.white_id, black_id: game.black_id },
                    { white_id: game.black_id, black_id: game.white_id },
                ],
            },
        });
    }

    private async finishGame(
        game: phone_zchecs_game,
        result: ZchecsResult | null,
        reason: ZchecsEndReason
    ): Promise<phone_zchecs_game> {
        let whiteDelta: number | null = null;
        let blackDelta: number | null = null;
        let whiteAfter: number | null = null;
        let blackAfter: number | null = null;

        // Seules les parties classees terminees par un resultat touchent a l'ELO.
        if (game.ranked && result) {
            const [whiteElo, blackElo, recent] = await Promise.all([
                this.getElo(game.white_id),
                this.getElo(game.black_id),
                this.countRecentRankedGames(game),
            ]);

            // Anti-farm: au-dela du seuil, les gains contre le meme adversaire sont divises.
            const factor = recent >= ZCHECS_FARM_THRESHOLD ? ZCHECS_FARM_FACTOR : 1;

            const whiteScore: 0 | 0.5 | 1 = result === 'WHITE' ? 1 : result === 'BLACK' ? 0 : 0.5;
            const blackScore: 0 | 0.5 | 1 = whiteScore === 1 ? 0 : whiteScore === 0 ? 1 : 0.5;

            whiteDelta = computeEloDelta(whiteElo.elo, blackElo.elo, whiteScore, this.gamesOf(whiteElo), factor);
            blackDelta = computeEloDelta(blackElo.elo, whiteElo.elo, blackScore, this.gamesOf(blackElo), factor);

            whiteAfter = Math.max(0, whiteElo.elo + whiteDelta);
            blackAfter = Math.max(0, blackElo.elo + blackDelta);

            await Promise.all([
                this.applyElo(game.white_id, whiteAfter, whiteScore),
                this.applyElo(game.black_id, blackAfter, blackScore),
            ]);
        }

        return this.prismaService.phone_zchecs_game.update({
            where: { id: game.id },
            data: {
                status: 'FINISHED',
                result,
                end_reason: reason,
                draw_offer_by: null,
                draw_offer_at: null,
                // Sans ca, settleClock continuerait a decompter sur une partie finie.
                clock_since: null,
                white_elo_delta: whiteDelta,
                black_elo_delta: blackDelta,
                white_elo_after: whiteAfter,
                black_elo_after: blackAfter,
            },
        });
    }

    private gamesOf(elo: EloRow): number {
        return elo.wins + elo.losses + elo.draws;
    }

    private async applyElo(citizenId: string, elo: number, score: 0 | 0.5 | 1): Promise<void> {
        const wins = score === 1 ? 1 : 0;
        const losses = score === 0 ? 1 : 0;
        const draws = score === 0.5 ? 1 : 0;

        await this.prismaService.phone_zchecs_elo.upsert({
            where: { identifier: citizenId },
            create: { identifier: citizenId, elo, wins, losses, draws },
            update: {
                elo,
                wins: { increment: wins },
                losses: { increment: losses },
                draws: { increment: draws },
            },
        });
    }

    private async toDto(game: phone_zchecs_game, citizenId: string): Promise<ZchecsGame> {
        const myColor = this.getColor(game, citizenId);
        const opponentId = this.getOpponentId(game, citizenId);

        const [opponentElo, myElo] = await Promise.all([this.getElo(opponentId), this.getElo(citizenId)]);

        const chess = this.replay(game);
        const history = chess.history({ verbose: true });
        const last = history.length > 0 ? history[history.length - 1] : null;
        const lastMove: ZchecsMove | null = last ? { from: last.from, to: last.to, san: last.san } : null;

        const drawOfferLive = this.hasLiveDrawOffer(game);
        const games = this.gamesOf(myElo);
        const clock = this.settleClock(game);

        return {
            id: game.id,
            ranked: game.ranked,
            status: game.status as ZchecsStatus,
            fen: game.fen,
            myColor,
            isMyTurn: game.status === 'ACTIVE' && this.getTurn(game.fen) === myColor,
            isCreator: game.creator_id === citizenId,
            opponentNumber: myColor === 'w' ? game.black_number : game.white_number,
            // Pseudo uniquement: le nom du personnage ne doit jamais fuiter ici.
            opponentName: opponentElo.pseudo || null,
            opponentElo: opponentElo.elo,
            result: (game.result as ZchecsResult) ?? null,
            endReason: (game.end_reason as ZchecsEndReason) ?? null,
            myEloDelta: myColor === 'w' ? game.white_elo_delta : game.black_elo_delta,
            myEloAfter: myColor === 'w' ? game.white_elo_after : game.black_elo_after,
            drawOfferFromOpponent: drawOfferLive && game.draw_offer_by === opponentId,
            drawOfferFromMe: drawOfferLive && game.draw_offer_by === citizenId,
            moves: history.map(move => move.san),
            lastMove,
            deadlineAt: game.status === 'ACTIVE' ? game.last_move_at.getTime() + ZCHECS_TIMEOUT_MS : null,
            lastMoveAt: game.last_move_at.getTime(),
            createdAt: game.createdAt.getTime(),
            variant: game.variant as ZchecsVariant,
            timeControl: game.time_control as ZchecsTimeControl,
            myTimeMs: myColor === 'w' ? clock.whiteMs : clock.blackMs,
            opponentTimeMs: myColor === 'w' ? clock.blackMs : clock.whiteMs,
            clockRunning: game.status === 'ACTIVE' && Boolean(game.clock_since),
            myChecks: myColor === 'w' ? game.white_checks : game.black_checks,
            opponentChecks: myColor === 'w' ? game.black_checks : game.white_checks,
            stake:
                game.ranked && game.status === 'ACTIVE'
                    ? {
                          win: computeEloDelta(myElo.elo, opponentElo.elo, 1, games),
                          loss: computeEloDelta(myElo.elo, opponentElo.elo, 0, games),
                          draw: computeEloDelta(myElo.elo, opponentElo.elo, 0.5, games),
                      }
                    : null,
        };
    }

    private async pushGame(citizenId: string, game: phone_zchecs_game, reason: ZchecsNotifyReason): Promise<void> {
        const target = this.serverStateService.getPlayerByCitizenId(citizenId);

        // Hors ligne: l'etat sera recupere au prochain chargement du telephone.
        if (!target) {
            return;
        }

        TriggerClientEvent(ClientEvent.PHONE_APP_ZCHECS_UPDATE, target.source, {
            game: await this.toDto(game, citizenId),
            reason,
        });
    }
}
