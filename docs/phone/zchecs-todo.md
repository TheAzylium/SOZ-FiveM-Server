# ZChecs — TODO

Checklist de ce qu'il reste à faire pour finaliser l'app ZChecs du téléphone.

Le code est complet et compile (`yarn lint` + `yarn build` OK). Ce qui reste
tient en trois blocs : **les assets** (sons + images, côté CDN), **la base de
données** (migrations à appliquer) et **les tests en jeu**.

---

## ⚠️ À faire en premier

### Migrations à appliquer

```bash
cd "server/resources/[soz]/soz-core" && npx prisma migrate deploy
```

Quatre migrations existent, dans l'ordre :

| Migration | Contenu |
|---|---|
| `20260820120000_add_zchecs` | `phone_zchecs_game`, `phone_zchecs_elo`, `phone_zchecs_queue` |
| `20260820140000_zchecs_improvements` | `draw_offer_at`, `last_move_at`, `hidden_by_*`, `*_elo_after` |
| `20260820160000_zchecs_game_modes` | pendule (`time_control`, `*_time_ms`, `increment_ms`, `clock_since`) + variantes (`variant`, `*_checks`) |
| `20260820180000_zchecs_pseudo` | `pseudo` sur `phone_zchecs_elo` |

> `npx prisma generate` peut échouer avec `EPERM ... query-engine-windows.exe`
> si le serveur FiveM tourne : il verrouille le binaire. Les **types TypeScript
> sont quand même régénérés**, seul le remplacement du moteur échoue. Arrêter le
> serveur avant de générer si tu veux une passe propre.

---

## 1. Sons — CDN

Chargés via `getPath()`, donc depuis `{publicEndpoint}/static/game/`.
Rien à embarquer dans la ressource.

**Dossier cible : `audio/phone/misc/`**

- [ ] `zchecs-invite.mp3` — quelqu'un t'envoie un défi
- [ ] `zchecs-matched.mp3` — la file classée t'a trouvé un adversaire
- [ ] `zchecs-move.mp3` — l'adversaire a joué, c'est à toi
- [ ] `zchecs-draw-offer.mp3` — l'adversaire propose la nulle
- [ ] `zchecs-reminder.mp3` — rappel avant de perdre par forfait
- [ ] `zchecs-win.mp3` — victoire
- [ ] `zchecs-loss.mp3` — défaite
- [ ] `zchecs-draw.mp3` — nulle, ou défi refusé

| | |
|---|---|
| Format | mp3 recommandé (ogg / wav marchent, Howler décode via WebAudio) |
| Durée | court, < 2 s — les sons ne bouclent pas |
| Volume | suit le curseur « son de notification », coupé en mode avion |
| Préfixe | `zchecs-` obligatoire : `misc/` est partagé avec les sons système |

**Aucun fichier n'est bloquant** : un son manquant retombe sur le son de
notification du téléphone, avec un avertissement en console F8. Tu peux n'en
uploader qu'un pour commencer.

Noms centralisés dans `ZCHECS_SOUND_FILES` / `ZCHECS_SOUND_FOLDER`
(`apps/zchecs/zchecs.sounds.ts`).

---

## 2. Images — CDN

### 2.1 Icône de l'app

- [ ] Uploader `images/phone/apps/zchecs/logo.webp`
- [ ] Remplacer le SVG inline (`apps/zchecs/icon.tsx`) par :

```tsx
import React from 'react';

import { AppSimpleIcon } from '../../components/system/AppIcon';

const ZchecsIcon: React.FC = props => {
    return <AppSimpleIcon {...props} name="zchecs" />;
};

export default ZchecsIcon;
```

### 2.2 Pièces du plateau

Les pièces sont des lettres françaises (R D T F C P). Le rendu est isolé dans
**un seul fichier**, `apps/zchecs/components/ZchecsPiece.tsx`.

- [ ] Uploader 12 images dans `images/phone/apps/zchecs/pieces/`

| Blancs | Noirs | Pièce |
|---|---|---|
| `wk.webp` | `bk.webp` | Roi |
| `wq.webp` | `bq.webp` | Dame |
| `wr.webp` | `br.webp` | Tour |
| `wb.webp` | `bb.webp` | Fou |
| `wn.webp` | `bn.webp` | Cavalier |
| `wp.webp` | `bp.webp` | Pion |

**Format** : webp transparent, carré, **128 × 128** (cases de 44 px, pièce
rendue à 34 px).

- [ ] Basculer `ZchecsPiece.tsx` sur les images

⚠️ **Trois pièges** :
1. `PIECE_LABELS` doit rester exporté — utilisé par `ZchecsBoard` (libellés
   d'accessibilité) et le sélecteur de promotion.
2. Le composant a **deux variants** : `board` (34 px, sur l'échiquier) et
   `captured` (petite étiquette dans la ligne des prises). Les deux doivent
   pointer vers la bonne taille d'asset.
3. `className` doit pouvoir écraser la taille par défaut : le variant `board`
   est aussi utilisé en 44 px dans le sélecteur de promotion.

---

## 3. Tests en jeu (à 2 clients)

Rien de tout ça n'a pu être testé hors du jeu.

**Parcours de base**
- [ ] A défie le `555-xxxx` de B → B reçoit notif + badge, voit l'invitation
- [ ] B accepte, A joue → B reçoit « à toi de jouer », le badge suit
- [ ] Le dernier coup est surligné en jaune à l'ouverture
- [ ] Inviter un joueur **hors ligne** : la partie se crée, il la voit à sa connexion
- [ ] **Plusieurs parties amicales avec la même personne** en parallèle
- [ ] B refuse un défi → aucun impact ELO

**Règles**
- [ ] Coup illégal refusé côté serveur (aucun changement d'état ni d'ELO)
- [ ] Promotion → sélecteur D/T/F/C
- [ ] Échec et mat → ELO attribué
- [ ] Nulle par répétition triple *(bug corrigé, à confirmer en vrai)*
- [ ] Roi de la colline : roi sur `e4` → victoire immédiate
- [ ] Triple échec : 3 échecs → victoire immédiate

**Pendule (parties rapides)**
- [ ] Le 1er coup des blancs n'est **pas** décompté
- [ ] Ranger le téléphone → au retour, le temps a continué de défiler
- [ ] Se déconnecter pendant son tour → perte au temps (`FLAG`) à la reconnexion
- [ ] Laisser filer à zéro **les deux joueurs hors ligne** → la partie doit être
      déjà terminée à la reconnexion (c'est le `@Tick` serveur qui l'a close)

**Fin anticipée**
- [ ] Abandon, proposition de nulle acceptée puis refusée
- [ ] Forfait 3 jours réclamable *(mode Correspondance uniquement en pratique)*
- [ ] Masquer une partie terminée → disparaît de **ton** historique seulement

**Classé**
- [ ] Les deux cherchent un adversaire → appariement, deltas ELO cohérents
- [ ] Classement : avatar, nombre de parties, rang perso hors top 100

**Pseudo**
- [ ] Sans pseudo, l'adversaire ne voit **que ton numéro** — jamais ton nom
- [ ] Après définition, le pseudo apparaît partout (liste, partie, classement)

**Notifications**
- [ ] `keepWhenPhoneClosed` : la notif arrive **téléphone fermé**
- [ ] Chaque son custom se déclenche sur le bon événement
- [ ] Rappel avant forfait : cron à **12:00 heure réelle du serveur**
      (`@Cron(12)`), fenêtre de 5 min, serveur allumé. Pour tester sans attendre,
      baisser temporairement l'heure du décorateur.

---

## 4. Points ouverts / à surveiller

- [ ] **Numéro de téléphone figé** — `white_number` / `black_number` sont des
      instantanés pris à la création. Si un joueur change de numéro en cours de
      partie, l'affichage et la résolution du contact utiliseront l'ancien.
      À vérifier si un changement de numéro est possible ; le cas échéant,
      résoudre le numéro à la volée depuis le `citizenid` dans `toDto()`.
- [ ] **Notification perdue hors ligne** — si l'adversaire n'est pas connecté au
      moment du coup, `pushGame()` ne fait rien. Il verra le badge à sa
      connexion, mais pas de notification.
- [ ] **Parties rapides et correspondance ne font pas bon ménage** — depuis que
      la pendule tourne en continu, une partie chronométrée n'est plus jouable en
      asynchrone. Le forfait 3 jours ne sert plus que pour `CORRESPONDENCE`.
- [ ] **Charge du tick** — `@Tick(2000)` interroge la base toutes les 2 s pour
      détecter les chutes de drapeau. Requête étroite (`status ACTIVE` +
      `clock_since` non nul), négligeable à petite échelle ; à surveiller si le
      nombre de parties rapides simultanées explose.
- [ ] **Personnage supprimé** — les parties d'un `citizenid` disparu restent en
      base et affichent le numéro. Un nettoyage périodique serait propre.
- [ ] **Doc obsolète** — `server/docs/phone/how-to-create-an-app.md` décrit
      l'ancien `soz-phone` (Rematch/Redux) qui n'existe plus.

---

## 5. Améliorations optionnelles

- [ ] **Curseur de volume dédié à ZChecs** (aujourd'hui les sons suivent « son de
      notification »). Demande de toucher `PhoneConfig`, `defaultConfig` et
      l'écran Paramètres.
- [ ] **Son distinct pour une prise** — le serveur connaît déjà la capture
      (`Move.isCapture()`), il suffirait de l'exposer dans le DTO.
- [ ] **Pseudos uniques** — aujourd'hui deux joueurs peuvent porter le même.
      Demanderait une contrainte d'unicité et un message d'erreur dédié.
- [ ] **Variantes supplémentaires** — handicap (sans dame / sans tour) et
      ouverture aléatoire ne sont **qu'une FEN de départ différente**, donc
      triviales. Chess960 est **hors de portée** (chess.js ne gère pas son
      roque), tout comme Atomic / Antichess / Crazyhouse (génération de coups).
- [ ] **Tests unitaires** sur les fonctions pures (`computeEloDelta`,
      `computeMaterial`, `frenchSan`, `readOutcome`). ⚠️ Le projet **n'a aucun
      runner de test** — il faudrait ajouter vitest et un script `test`.
- [ ] **Rematch en un clic** depuis une partie terminée.
- [ ] **Décote d'ELO** pour les joueurs inactifs.

---

## 6. Ce qui est déjà en place

Pour mémoire, l'app couvre aujourd'hui :

**Jeu** — règles complètes via `chess.js` (validation **serveur**, le client ne
fait que prévisualiser les coups légaux) · plateau aux couleurs chess.com avec
coordonnées · surbrillance du dernier coup · promotion · pièces prises et
balance matérielle · notation **française** (`Cf6`, pas `Nf6`) avec légende ·
rejeu coup par coup avec lecture automatique.

**Modes** — Correspondance · Blitz 5+3 · Rapide 10+5 · Longue 30 min ·
variantes Roi de la colline et Triple échec (parties amicales uniquement).

**Pendule** — temps réel, décompte continu téléphone fermé ou joueur déconnecté.
`clock_since` est la **seule source de vérité** côté serveur ; un `@Tick(2000)`
fait tomber le drapeau même si personne n'est connecté. Le premier coup des
blancs n'est pas décompté.

**ELO** — départ 1000, K=40 en calibrage puis 32, anti-farm ×0,25 au-delà de
3 parties/24 h contre le même adversaire, appariement par niveau, classement
(min. 3 parties) et courbe de progression.

**Identité** — pseudo choisi par le joueur, **jamais** le nom du personnage.
Ordre d'affichage : **pseudo → contact → numéro**.

**Confort** — badge d'accueil, notifications sonorisées (supprimées sur la
partie qu'on regarde déjà), rappel avant forfait, expiration des propositions de
nulle et des entrées en file, masquage des parties terminées.

---

## Fichiers de référence

| Rôle | Chemin (depuis `server/resources/[soz]/soz-core/`) |
|---|---|
| Types, constantes, ELO, validation pseudo | `src/shared/phone/apps/zchecs.ts` |
| Serveur (RPC, règles, ELO, pendule, cron, tick) | `src/server/phone/apps/phone.app.zchecs.provider.ts` |
| Client FiveM | `src/client/phone/apps/phone.app.zchecs.provider.ts` |
| État NUI + notifications | `src/nui/components/Phone/apps/zchecs/zchecs.atom.ts` |
| Sons | `src/nui/components/Phone/apps/zchecs/zchecs.sounds.ts` |
| **Pièces (à passer en images)** | `src/nui/components/Phone/apps/zchecs/components/ZchecsPiece.tsx` |
| **Icône (à passer en images)** | `src/nui/components/Phone/apps/zchecs/icon.tsx` |
| Plateau | `src/nui/components/Phone/apps/zchecs/components/ZchecsBoard.tsx` |
| Pendule (affichage) | `src/nui/components/Phone/apps/zchecs/hooks/useZchecsClock.ts` |
| Libellés FR | `src/nui/components/Phone/system/locale/fr.ts` → bloc `ZCHECS` |

---

## Itérer sur l'UI sans lancer FiveM

Des parties factices sont injectées automatiquement en mode navigateur
(`useInjectDebugData` dans `zchecs.atom.ts`) : invitation, partie à ton tour,
blitz en cours, urgence avant forfait, variante triple échec, parties terminées
dont une riche en prises et en roque.

```bash
cd "server/resources/[soz]/soz-core" && yarn dev-nui
```

⚠️ **Deux ports codés en dur dans le projet, tous deux sur 9000** :
`public/index.html` (chargement du bundle) et le `publicPath` webpack dont
dépend le Worker de `GlassMorphismProvider`. Servir sur un autre port fait
**crasher toute l'UI** (`SecurityError: Failed to construct 'Worker'`).
Le port 9000 doit donc être libre — il était occupé par Docker pendant le
développement.

⚠️ `useInjectDebugData` rejoue `setGames` à **chaque rendu** : toute donnée
injectée à la main depuis la console est écrasée au rendu suivant. Pour tester
un cas particulier, l'ajouter aux mocks plutôt qu'à la console.
