import { Inject } from '@core/decorators/injectable';
import { Rpc } from '@core/decorators/rpc';
import { phone_zchecs_game, Prisma } from '@prisma/client';
import { Provider } from '@public/core/decorators/provider';
import { ClientEvent } from '@public/shared/event/client';
import { LeaderboardInterface } from '@public/shared/phone/apps/game';
import {
    computeEloDelta,
    ZCHECS_ELO_START,
    ZCHECS_MAX_ACTIVE_GAMES,
    ZCHECS_START_FEN,
    ZCHECS_TIMEOUT_MS,
    ZchecsColor,
    ZchecsEndReason,
    ZchecsGame,
    ZchecsMovePayload,
    ZchecsNotifyReason,
    ZchecsProfile,
    ZchecsResult,
    ZchecsStatus,
} from '@public/shared/phone/apps/zchecs';
import { RpcServerEvent } from '@public/shared/rpc';
import { Chess } from 'chess.js';

import { Err, Ok, Result } from '../../../shared/result';
import { PrismaService } from '../../database/prisma.service';
import { PlayerService } from '../../player/player.service';
import { ServerStateService } from '../../server.state.service';

type EloRow = { identifier: string; elo: number; wins: number; losses: number; draws: number };

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

        const games = await this.prismaService.phone_zchecs_game.findMany({
            where: {
                OR: [{ white_id: player.citizenid }, { black_id: player.citizenid }],
            },
            orderBy: { updatedAt: 'desc' },
            take: 60,
        });

        return Promise.all(games.map(game => this.toDto(game, player.citizenid)));
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_GET_PROFILE)
    public async getProfile(source: number): Promise<ZchecsProfile | null> {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return null;
        }

        const [elo, queue] = await Promise.all([
            this.getElo(player.citizenid),
            this.prismaService.phone_zchecs_queue.findUnique({ where: { identifier: player.citizenid } }),
        ]);

        return {
            elo: elo.elo,
            wins: elo.wins,
            losses: elo.losses,
            draws: elo.draws,
            inQueue: Boolean(queue),
        };
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_GET_LEADERBOARD)
    public async getLeaderboard(): Promise<LeaderboardInterface[]> {
        const rows: any[] = await this.prismaService.$queryRaw(
            Prisma.sql`
                SELECT player.citizenid,
                       phone_profile.avatar,
                       concat(JSON_VALUE(player.charinfo, '$.firstname'), ' ', JSON_VALUE(player.charinfo, '$.lastname')) as player_name,
                       phone_zchecs_elo.elo                                                                              AS score,
                       (phone_zchecs_elo.wins + phone_zchecs_elo.losses + phone_zchecs_elo.draws)                         AS game_played
                FROM phone_zchecs_elo
                         LEFT JOIN player ON player.citizenid = phone_zchecs_elo.identifier
                         LEFT JOIN phone_profile ON JSON_VALUE(player.charinfo, '$.phone') = phone_profile.number
                WHERE player.citizenid IS NOT NULL
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

    /* ---------------------------------------------------------------- *
     *  Creation de partie amicale
     * ---------------------------------------------------------------- */

    @Rpc(RpcServerEvent.PHONE_APP_ZCHECS_CREATE)
    public async createGame(source: number, phoneNumber: string): Promise<Result<ZchecsGame, string>> {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return Err('Joueur introuvable');
        }

        const number = (phoneNumber || '').trim();

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

        const existing = await this.prismaService.phone_zchecs_game.findFirst({
            where: {
                status: { in: ACTIVE_STATUSES },
                OR: [
                    { white_id: player.citizenid, black_id: targetCitizenId },
                    { white_id: targetCitizenId, black_id: player.citizenid },
                ],
            },
        });

        if (existing) {
            return Err('Une partie est deja en cours avec ce joueur');
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

        const opponent = await this.prismaService.$transaction(async tx => {
            const candidate = await tx.phone_zchecs_queue.findFirst({
                where: { identifier: { not: player.citizenid } },
                orderBy: { createdAt: 'asc' },
            });

            if (!candidate) {
                await tx.phone_zchecs_queue.upsert({
                    where: { identifier: player.citizenid },
                    create: { identifier: player.citizenid, number: player.charinfo.phone },
                    update: { number: player.charinfo.phone },
                });

                return null;
            }

            // Le premier a retirer l'adversaire de la file remporte l'appariement.
            const removed = await tx.phone_zchecs_queue.deleteMany({ where: { identifier: candidate.identifier } });

            if (removed.count === 0) {
                return null;
            }

            await tx.phone_zchecs_queue.deleteMany({ where: { identifier: player.citizenid } });

            return candidate;
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
            data: { status: 'ACTIVE' },
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
        const chess = new Chess(game.fen);

        if (chess.turn() !== myColor) {
            return Err("Ce n'est pas ton tour");
        }

        try {
            chess.move({ from: payload.from, to: payload.to, promotion: payload.promotion });
        } catch {
            return Err('Coup illegal');
        }

        const outcome = this.readOutcome(chess);

        let updated = await this.prismaService.phone_zchecs_game.update({
            where: { id: game.id },
            data: {
                fen: chess.fen(),
                pgn: chess.pgn(),
                draw_offer_by: null,
            },
        });

        if (outcome) {
            updated = await this.finishGame(updated, outcome.result, outcome.reason);
        }

        await this.pushGame(this.getOpponentId(updated, player.citizenid), updated, outcome ? 'END' : 'MOVE');

        return Ok(await this.toDto(updated, player.citizenid));
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

        if (game.draw_offer_by === player.citizenid) {
            return Err('Proposition deja envoyee');
        }

        const updated = await this.prismaService.phone_zchecs_game.update({
            where: { id: game.id },
            data: { draw_offer_by: player.citizenid },
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

        if (game.status !== 'ACTIVE' || !game.draw_offer_by || game.draw_offer_by === player.citizenid) {
            return Err('Aucune proposition de nulle a traiter');
        }

        const updated = accept
            ? await this.finishGame(game, 'DRAW', 'DRAW_AGREED')
            : await this.prismaService.phone_zchecs_game.update({
                  where: { id: game.id },
                  data: { draw_offer_by: null },
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

        if (Date.now() - game.updatedAt.getTime() < ZCHECS_TIMEOUT_MS) {
            return Err("Le delai d'inactivite n'est pas ecoule");
        }

        const winner: ZchecsResult = myColor === 'w' ? 'WHITE' : 'BLACK';
        const updated = await this.finishGame(game, winner, 'TIMEOUT');

        await this.pushGame(this.getOpponentId(updated, player.citizenid), updated, 'END');

        return Ok(await this.toDto(updated, player.citizenid));
    }

    /* ---------------------------------------------------------------- *
     *  Interne
     * ---------------------------------------------------------------- */

    private getTurn(fen: string): ZchecsColor {
        return (fen.split(' ')[1] as ZchecsColor) || 'w';
    }

    private getColor(game: phone_zchecs_game, citizenId: string): ZchecsColor {
        return game.white_id === citizenId ? 'w' : 'b';
    }

    private getOpponentId(game: phone_zchecs_game, citizenId: string): string {
        return game.white_id === citizenId ? game.black_id : game.white_id;
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

        return row ?? { identifier: citizenId, elo: ZCHECS_ELO_START, wins: 0, losses: 0, draws: 0 };
    }

    private async finishGame(
        game: phone_zchecs_game,
        result: ZchecsResult | null,
        reason: ZchecsEndReason
    ): Promise<phone_zchecs_game> {
        let whiteDelta: number | null = null;
        let blackDelta: number | null = null;

        // Seules les parties classees terminees par un resultat touchent a l'ELO.
        if (game.ranked && result) {
            const [whiteElo, blackElo] = await Promise.all([this.getElo(game.white_id), this.getElo(game.black_id)]);

            const whiteScore: 0 | 0.5 | 1 = result === 'WHITE' ? 1 : result === 'BLACK' ? 0 : 0.5;
            const blackScore: 0 | 0.5 | 1 = whiteScore === 1 ? 0 : whiteScore === 0 ? 1 : 0.5;

            whiteDelta = computeEloDelta(whiteElo.elo, blackElo.elo, whiteScore);
            blackDelta = computeEloDelta(blackElo.elo, whiteElo.elo, blackScore);

            await Promise.all([
                this.applyElo(game.white_id, whiteElo, whiteDelta, whiteScore),
                this.applyElo(game.black_id, blackElo, blackDelta, blackScore),
            ]);
        }

        return this.prismaService.phone_zchecs_game.update({
            where: { id: game.id },
            data: {
                status: 'FINISHED',
                result,
                end_reason: reason,
                draw_offer_by: null,
                white_elo_delta: whiteDelta,
                black_elo_delta: blackDelta,
            },
        });
    }

    private async applyElo(citizenId: string, current: EloRow, delta: number, score: 0 | 0.5 | 1): Promise<void> {
        const wins = score === 1 ? 1 : 0;
        const losses = score === 0 ? 1 : 0;
        const draws = score === 0.5 ? 1 : 0;
        const elo = Math.max(0, current.elo + delta);

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

        const [opponentName, opponentElo] = await Promise.all([
            this.playerService.getNameFromCitizenId(opponentId),
            this.getElo(opponentId),
        ]);

        return {
            id: game.id,
            ranked: game.ranked,
            status: game.status as ZchecsStatus,
            fen: game.fen,
            myColor,
            isMyTurn: game.status === 'ACTIVE' && this.getTurn(game.fen) === myColor,
            isCreator: game.creator_id === citizenId,
            opponentNumber: myColor === 'w' ? game.black_number : game.white_number,
            opponentName: opponentName === 'Inconnu' ? null : opponentName,
            opponentElo: opponentElo.elo,
            result: (game.result as ZchecsResult) ?? null,
            endReason: (game.end_reason as ZchecsEndReason) ?? null,
            myEloDelta: myColor === 'w' ? game.white_elo_delta : game.black_elo_delta,
            drawOfferFromOpponent: game.draw_offer_by === opponentId,
            drawOfferFromMe: game.draw_offer_by === citizenId,
            lastMoveAt: game.updatedAt.getTime(),
            createdAt: game.createdAt.getTime(),
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
