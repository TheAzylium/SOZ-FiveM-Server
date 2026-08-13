# Arme d'entraînement "faux dégâts" (P90 training)

> Document vivant : mis à jour au fil du dev et des retours, voir le [Journal](#journal-des-décisions-et-retours) en bas de page pour l'historique.

## Statut actuel

- ✅ Équipement + animations confirmés fonctionnels en jeu (confirmé par l'utilisateur le 2026-08-13).
- ⏳ **À faire à la reprise** : dérouler la [checklist de tests de dégâts](#checklist-de-tests--dégâts-et-compteur-virtuel) ci-dessous et rapporter les résultats (en particulier tout compte de tirs qui ne colle pas à la formule attendue).

## Objectif

Une arme d'event/entraînement (`weapon_assaultsmg_training`) qui **ressemble, sonne et tire exactement comme la vraie P90** (`weapon_assaultsmg`) — mêmes dégâts, même chute de dégâts selon la distance, mêmes animations, mais avec son **propre hash d'arme dédié** (`WEAPON_ASSAULTSMG_TRAINING`) et toujours rendue en **teinte orange** pour bien la distinguer visuellement. Les vrais dégâts qu'elle inflige sont **annulés au dernier moment** côté client puis **rejoués sur un compteur virtuel** (plaques → gilet → vie). Quand ce compteur virtuel atteindrait 0, la cible ne meurt pas réellement : elle **ragdoll**, comme si elle tombait.

Le gilet pare-balles et les plaques d'armure ralentissent donc la chute exactement comme dans un vrai combat, sans jamais toucher aux vraies statistiques du joueur (vie, armure, plaques réelles inchangées après l'event). La distinction "c'est un chargeur de fausses balles" vient du fait que l'item `weapon_assaultsmg_training` n'accepte que la munition dédiée `ammo_training_04` (impossible d'y charger de vraies balles, et impossible de charger des balles à blanc dans une vraie P90).

## Logique générale (important, à ne pas perdre)

1. `weapon_assaultsmg_training` équipe son **propre hash d'arme natif dédié** `WEAPON_ASSAULTSMG_TRAINING` (resource `resources/[weapon]/soz-weapon-assaultsmg-training`), cloné à l'identique de la vraie P90 : mêmes dégâts, même chute de dégâts selon la distance/tête/membre, même modèle, son, recul, `ClipSize`, `AttachPoints`. Seul `<DamageType>` est mis à `NONE` (au lieu de `BULLET`) pour que le système de plaques d'armure **déjà existant** (`onReceived` dans `client/weapon/weapon.provider.ts`) ne réagisse pas à cette arme — les vraies plaques ne doivent jamais être touchées.
2. Comme c'est un hash **totalement dédié**, un impact de cette arme ne peut **jamais** être confondu avec un impact de la vraie P90 — la distinction se fait directement sur le hash de l'arme, sans dépendre d'un état annexe (contrairement à une version intermédiaire testée entre-temps, voir journal).
3. À l'équipement, l'arme est toujours forcée en teinte **Orange** (`WeaponTintColor.Orange`, système de teinte déjà existant) — signal visuel clair que c'est la version entraînement.
4. Côté client, sur la **victime elle-même**, dès qu'un impact `CEventNetworkEntityDamage` arrive avec le hash de `WEAPON_ASSAULTSMG_TRAINING` : on capture le vrai dégât que le moteur vient d'appliquer (avant/après sur `GetEntityHealth`/`GetPedArmour`, falloff/distance/tête/membre déjà inclus nativement par le moteur), on **annule immédiatement** ce dégât (remis à la valeur d'avant, dans le même tick, donc invisible), puis on envoie ce dégât réel capturé au serveur.
5. Le serveur reçoit ce dégât réel et le "dépense" sur un compteur virtuel par victime, dans cet ordre : **plaques** (1 plaque = 1 impact absorbé, peu importe le montant, comme le vrai système), puis **armure du gilet** (dégât réel soustrait jusqu'à 0), puis **vie** (pareil). Quand la vie virtuelle atteint 0 → ragdoll de la victime (event ciblé serveur → client, comme le système `POLICE_TAKE_DOWN`/`TAKE_DOWN_TARGET` déjà existant).
6. Rien de tout ça (plaques réelles, armure réelle, vie réelle) n'est jamais modifié pour de vrai.

**⚠️ Trois changements de logique en cours de route**, voir le [Journal](#journal-des-décisions-et-retours) pour le détail complet :
1. D'abord un `.meta` à dégâts quasi nuls + formule dupliquée en TS → corrigé en gardant les vraies stats de la P90 et en capturant/annulant le vrai dégât calculé par le moteur (pas de formule dupliquée).
2. Puis un hash natif dédié clone du `.meta` seul → cassé en jeu (crash, puis impossible à équiper) car il manquait le fichier `weaponanimations.meta` (aucune source disponible dans ce repo pour les vraies animations d'une arme à feu).
3. Repli temporaire sur la vraie arme + State Bag + teinte forcée (pour contourner l'absence d'animations) → **abandonné** dès que l'utilisateur a fourni les vrais `weapons.meta`/`weaponanimations.meta` du jeu de base, permettant de reconstruire un hash dédié complet et fiable (état actuel, décrit ci-dessus).

## Fichiers modifiés/créés

### Resource d'arme dédiée (clone complet, `.meta` + animations réelles)
- `resources/[weapon]/soz-weapon-assaultsmg-training/fxmanifest.lua` — `WEAPONINFO_FILE` + `WEAPON_ANIMATIONS_FILE` + `CONTENT_UNLOCKING_META_FILE` (pas de suffixe `_PATCH` : un nom d'arme totalement inédit a besoin d'un contenu additif complet, pas d'un patch sur de l'existant — voir journal). Même pattern que `soz-weapon-pickaxe`, le seul autre exemple du repo à créer une arme de zéro.
- `weapons.meta` — clone exact du bloc `CWeaponInfo` de `WEAPON_ASSAULTSMG` (valeurs de la version SOZ du serveur, avec `Damage=25`, falloff, etc. — pas les valeurs vanilla Rockstar, pour rester cohérent avec l'équilibrage déjà en place sur ce serveur), renommé `WEAPON_ASSAULTSMG_TRAINING`, `DamageType=NONE`, slot dédié `SLOT_ASSAULTSMG_TRAINING` enregistré dans `SlotNavigateOrder`/`SlotBestOrder` (OrderNumber `500`).
- `weaponanimations.meta` — **extrait directement des vrais fichiers du jeu de base fournis par l'utilisateur** (`weapons.meta`/`weaponanimations.meta` extraits via un outil externe type OpenIV/CodeWalker). Contient les entrées réelles `WEAPON_ASSAULTSMG` (renommées `WEAPON_ASSAULTSMG_TRAINING`) pour les sets `Default` (corps par défaut/masculin), `MP_F_Freemode` (personnage féminin), `FirstPerson` et `FirstPersonAiming` (visée à la première personne — ce set contient 3 sous-entrées réelles pour les transitions hip-fire/aim-ready/scope). Les autres sets du jeu (`Ballistic`, `Gang`, `Fat`, `SuperFat`, `Female`, `GangFemale`, etc. — variantes de PNJ, pas de personnages joueurs) ne sont pas repris, ils ne sont pas nécessaires pour un item joueur.
- `contentunlocks.meta` — déclaration `CU_WEP_ASSAULTSMG_TRAINING`, même pattern que `soz-weapon-pickaxe`.
- Démarre automatiquement : `modules-prod.cfg` fait `start [weapon]` sur tout le dossier, pas besoin d'`ensure` manuel.

### Déclaration TS de l'arme
- `resources/[soz]/soz-core/src/shared/weapons/weapon.ts` :
  - `WeaponName.ASSAULTSMG_TRAINING = 'WEAPON_ASSAULTSMG_TRAINING'` — correspond maintenant à un vrai hash natif (la resource ci-dessus).
  - `WeaponConfig` étendu avec `nativeWeapon?: WeaponName` (inutilisé pour cette arme désormais, gardé pour un futur variant qui en aurait besoin) et `forcedTint?: WeaponTintColor` (teinte forcée à l'équipement, utilisé ici avec `WeaponTintColor.Orange`).
  - Entrée `Weapons[ASSAULTSMG_TRAINING]` : `ammo: 'ammo_training_04'`, `forcedTint: WeaponTintColor.Orange`, mêmes attachements que la vraie P90.
  - `WeaponConfig.ammo` (type union) étendu avec `'ammo_training_04'`.
  - `WeaponAmmo[ASSAULTSMG_TRAINING]` = `'5.7x28 SB193 à blanc'` (affiché dans la description d'objet en jeu).
  - `TrainingWeapons` = liste des noms d'arme "entraînement" (actuellement juste celle-ci) — sert à calculer le(s) hash(es) natif(s) dédié(s) à surveiller pour la capture de dégâts.
  - `TrainingWeaponConfig` = réglages de gameplay uniquement : `ragdollDurationMs` (10s) et `sessionTimeoutMs` (20s, délai au-delà duquel une session de "faux combat" contre une victime repart de zéro si plus aucun impact n'est arrivé).

### Équipement — teinte forcée
- `resources/[soz]/soz-core/src/client/weapon/weapon.service.ts` :
  - Méthode `getNativeWeaponHash(name)` : résout `WeaponConfig.nativeWeapon` si présent (sinon le nom de l'arme lui-même), puis hash — passthrough pour `weapon_assaultsmg_training` (pas de `nativeWeapon` défini), gardée comme infrastructure réutilisable pour un futur variant qui, lui, équiperait une autre arme réelle.
  - `set()` applique `config.forcedTint` (`SetPedWeaponTintIndex`) si défini, sinon la teinte de l'item.
- `resources/[soz]/soz-core/src/client/weapon/weapon.provider.ts` (`onWeaponTick`, `onCheck()`) et `resources/[soz]/soz-core/src/client/weapon/weapon.gunsmith.provider.ts` (`setWeapon()`) utilisent aussi `getNativeWeaponHash()` par cohérence — sans effet sur cette arme précise puisqu'elle n'a pas de `nativeWeapon`.

### Items d'inventaire
- `resources/[qb]/qb-core/shared/items.lua` : `weapon_assaultsmg_training` (arme) et `ammo_training_04` (munition à blanc).
- `resources/[soz]/soz-core/src/server/weapon/weapon.provider.ts` : callback `useAmmo` enregistré pour `ammo_training_04` (sinon "utiliser" la munition en jeu ne recharge pas l'arme).

### Alertes police
- `resources/[soz]/soz-core/src/client/weapon/weapon.provider.ts` : `weapon_assaultsmg_training` ajoutée à `messageExclude` → ne déclenche jamais d'alerte "555-POLICE" en tirant, sans affecter les vraies P90.

### Boutique armurerie
- `resources/[soz]/soz-core/src/shared/shop/boss.ts` : certificat d'achat `weapon_assaultsmg_training` ajouté dans les 3 blocs d'armurerie existants (même pattern que `weapon_assaultsmg`/`weapon_pumpshotgun`), 500$.

### Logique de capture/annulation du dégât (client) — le cœur du système
- `resources/[soz]/soz-core/src/client/weapon/training.weapon.provider.ts` :
  - `@Tick(EVERY_FRAME)` : garde en mémoire la dernière vie/armure connues du joueur (`lastKnownHealth`/`lastKnownArmour`), lues juste avant qu'un éventuel impact ne les modifie.
  - `@OnGameEvent(CEventNetworkEntityDamage)` filtré sur `victim === PlayerPedId()` et le hash dédié de `WEAPON_ASSAULTSMG_TRAINING` : calcule `avant - après` sur vie et armure (= le vrai dégât que le moteur vient d'appliquer), **remet immédiatement** vie/armure à `lastKnownHealth`/`lastKnownArmour` (annulation, invisible car dans le même tick), puis envoie le total au serveur via `ServerEvent.TRAINING_WEAPON_HIT`.
  - **Correctif plaques réelles** : si le joueur porte de vraies plaques (`nbArmorPlates > 0`), le jeu applique déjà un `SetPlayerWeaponDefenseModifier` global à 10% (système existant, indépendant de notre arme). Comme on ne touche jamais aux vraies plaques, ce modificateur reste actif même après que le compteur *virtuel* de plaques soit à 0 côté serveur — le dégât capturé serait donc 10x trop faible. On multiplie donc par 10 dans ce cas précis pour retrouver le vrai dégât de la P90. **Confirmé : si le joueur n'a pas de plaques (`nbArmorPlates === 0`), aucun multiplicateur n'est appliqué** — le dégât capturé est utilisé tel quel, brut.
  - Conserve aussi le handler `TRAINING_WEAPON_DOWN` → `SetPedToRagdoll`.

### Logique de compteur virtuel (serveur)
- `resources/[soz]/soz-core/src/server/weapon/training.weapon.provider.ts` :
  - `@OnEvent(ServerEvent.TRAINING_WEAPON_HIT)` reçoit `(source, damage)` du client-victime.
  - Maintient une session par victime (`Map<source, { platesLeft, armorLeft, healthLeft, lastHitAt }>`), initialisée depuis les vraies valeurs actuelles (`nbArmorPlates`, `metadata.armor.current`, `metadata.health`) si aucune session active ou si `sessionTimeoutMs` est dépassé.
  - Dépense chaque impact dans l'ordre **plaques (1 par impact) → armure (montant réel) → vie (montant réel)**.
  - À 0 de vie virtuelle : supprime la session et déclenche `ClientEvent.TRAINING_WEAPON_DOWN` sur la victime.
  - Nettoyage de la session sur déconnexion (`@On('playerDropped')`).

### Events ajoutés
- `resources/[soz]/soz-core/src/shared/event/client.ts` : `ClientEvent.TRAINING_WEAPON_DOWN`.
- `resources/[soz]/soz-core/src/shared/event/server.ts` : `ServerEvent.TRAINING_WEAPON_HIT`.

### Enregistrement des providers
- `resources/[soz]/soz-core/src/client/weapon/weapon.module.ts` et `resources/[soz]/soz-core/src/server/weapon/weapon.module.ts` : `TrainingWeaponProvider` ajouté à la liste des `providers`.

## Points d'attention / limites connues

1. **Sécurité/triche** : le dégât capturé est envoyé par le client de la victime elle-même (déclaratif, non re-vérifié serveur). C'est exactement le même niveau de confiance que le système `NonLethalWeapons` déjà existant dans ce repo (entièrement client-side, hash d'arme dédié) — un client modifié pourrait mentir sur le montant pour CETTE arme précisément, mais ne peut pas affecter le PvP réel au P90 puisque le hash est totalement séparé. Acceptable pour un usage event/entraînement supervisé.
2. **Risque de "vraie mort" dans un cas limite** : les dégâts réels (falloff/distance inclus) s'appliquent d'abord nativement avant d'être annulés. Si la vie réelle d'un joueur est déjà très basse au moment d'être touché, il existe un (rare) risque que le moteur du jeu déclenche l'état de mort réel avant que le script n'ait pu annuler le dégât dans le même tick. Mitigation possible : s'assurer que les participants sont à pleine vie/armure avant un exercice avec cette arme.
3. **Preuves/indices police** : le handler serveur existant `onWeaponDamageEvent` (système d'indices de la police scientifique) n'exclut pas cette arme — un impact sur une cible sans gilet peut toujours poser un indice "sang" sur la scène. Pas corrigé (pas demandé), facile à exclure si besoin.
4. **Sets d'animation non repris** : seuls `Default`, `MP_F_Freemode`, `FirstPerson`, `FirstPersonAiming` ont été extraits (couvrent les personnages joueurs standards). Si un jour cette arme est donnée à un PNJ "Fat"/"SuperFat"/"Gang"/etc., ces sets manquants tomberont sur le `<Fallback>Default</Fallback>` du set correspondant dans le jeu de base — comportement dégradé possible mais non testé, non prioritaire (arme prévue pour des joueurs, pas des PNJ).
5. **Fichiers sources non conservés dans le repo** : les `weapons.meta`/`weaponanimations.meta` du jeu de base fournis par l'utilisateur pour l'extraction ont été supprimés après usage (fichiers volumineux et soumis au copyright Rockstar — à ne jamais committer, en particulier sur un repo dont la branche principale est `oss`/open-source). Si une future arme a besoin du même traitement, il faudra refournir ces fichiers.

## Vérification de base (équipement/animation) — ✅ confirmé le 2026-08-13

1. Donner `weapon_assaultsmg_training` + `ammo_training_04` (admin, ou achat armurerie à 500$).
2. Vérifier que l'arme s'équipe normalement en main (plus de flicker/disparition) et apparaît **orange**. ✅
3. Vérifier avec un personnage féminin (teste le set `MP_F_Freemode`) et en vue première personne (`FirstPerson`/`FirstPersonAiming`) que l'animation est correcte (pas de T-pose). ✅

## Checklist de tests — dégâts et compteur virtuel

⏳ Reste à dérouler. Si un compte de tirs ne colle pas à la formule attendue, noter précisément lequel, avec les vraies valeurs vie/armure/plaques de la cible avant le test.

### 1. Vérifier qu'aucun vrai dégât n'est appliqué
- Ouvrir le HUD/panneau admin pour voir la vie et l'armure réelles d'un joueur cible.
- Tirer plusieurs fois dessus avec `weapon_assaultsmg_training`.
- **Attendu** : sa vie et son armure réelles ne bougent jamais, même d'un point, pendant les tirs.

### 2. Cible sans gilet ni plaques
- Noter la vie actuelle de la cible (`metadata.health`).
- Tirer dessus jusqu'au ragdoll.
- **Attendu** : nombre de tirs ≈ `vie_actuelle / 25` (arrondi au supérieur). Ex. 100 PV → 4 tirs. Le dégât réel par tir dépend de la zone touchée (tête ×2.5, membre ×0.5 selon le `.meta`), donc viser le torse pour un test propre.

### 3. Cible avec gilet, sans plaques
- Équiper un gilet sur la cible (armure à 100 par exemple), 0 plaque.
- Tirer dessus.
- **Attendu** : d'abord `armure / 25` tirs pour vider le gilet virtuel, puis `vie / 25` tirs pour la vie — total = les deux additionnés. L'armure et la vie réelles ne bougent pas pendant ce temps.

### 4. Cible avec gilet + plaques
- Équiper gilet + N plaques (ex. 2).
- Tirer dessus.
- **Attendu** : ordre exact **plaques (1 tir = 1 plaque, peu importe où on touche) → armure gilet → vie**. Total = N (plaques) + `armure/25` + `vie/25`. Vérifier que les tirs "plaques" ne font tomber ni l'armure ni la vie virtuelle tant qu'il reste des plaques.

### 5. Compensation ×10 plaques réelles
- Avec plaques réellement équipées (donc `nbArmorPlates > 0`), vérifier que le comptage colle bien à la formule du test 4 (pas 10x plus de tirs que prévu, pas 10x moins). Si le compte est faux d'un facteur ~10, c'est ce correctif (`client/weapon/training.weapon.provider.ts`) qui merde.

### 6. Sans plaques, pas de multiplicateur
- Cible avec gilet mais 0 plaque : vérifier que le nombre de tirs colle à `armure/25 + vie/25` sans distorsion.

### 7. Session qui expire (20s)
- Tirer une ou deux fois sur une cible (sans la faire tomber), attendre **plus de 20 secondes** sans retirer, puis retirer.
- **Attendu** : le compteur repart de la vie/armure/plaques *actuelles* de la cible (pas de cumul avec les tirs d'avant l'expiration).

### 8. Deux victimes en simultané
- Faire tirer deux personnes différentes en même temps (ou une même personne sur deux cibles alternées).
- **Attendu** : chaque victime a son propre compteur indépendant, pas de mélange.

### 9. La vraie P90 reste intacte
- Tirer avec la vraie `weapon_assaultsmg` sur quelqu'un.
- **Attendu** : dégâts réels normaux, pas de ragdoll magique, comportement 100% inchangé.

### 10. Pas d'alerte police
- Tirer avec l'arme d'entraînement à portée d'une zone qui déclencherait normalement une alerte.
- **Attendu** : aucun message "555-POLICE".

### 11. Durée du ragdoll
- Chronométrer le temps au sol après un ragdoll déclenché.
- **Attendu** : ~10 secondes (`ragdollDurationMs`).

## Journal des décisions et retours

Historique chronologique des choix et corrections, pour garder la trace du *pourquoi* sans avoir à tout relire.

- **2026-08-13 — Conception initiale.** Arme clone de la P90 avec dégâts natifs quasi nuls dans le `.meta` (`0.0010000`, comme `weapon_pumpshotgun` non-létal déjà dans le repo) + `DamageType=NONE`. Seuils de "faux impacts" avant ragdoll basés sur une formule `TrainingWeaponConfig` avec `simulatedDamagePerHit` fixé en dur (25). Ordre de dépense confirmé par l'utilisateur : plaques (1 par impact) → armure du gilet (montant réel) → vie (montant réel), 100% virtuel, rien de réel n'est jamais consommé.
- **2026-08-13 — Retour utilisateur : le `25` ne doit pas être une valeur en dur.** L'utilisateur veut le **vrai** dégât de la P90, avec la vraie chute de dégâts selon la distance, pas une approximation.
- **2026-08-13 — Première tentative de correction (formule dupliquée) — abandonnée.** Tentative de répliquer la formule de falloff de GTA à la main. L'utilisateur a coupé court : **pas de config qui duplique/approxime les stats de l'arme réelle**. Demande précise : garder le `.meta` identique à la vraie P90, **annuler** le vrai dégât au moment où il s'applique, et le **stocker** — pas le recalculer.
- **2026-08-13 — Implémentation hash dédié v1.** `.meta` avec `Damage=25.000000` identique à la vraie P90. Capture/annulation/envoi au serveur via `ServerEvent.TRAINING_WEAPON_HIT`. Compensation ×10 documentée pour les vraies plaques équipées. **Confirmé par l'utilisateur** : sans plaques, pas de multiplicateur.
- **2026-08-13 — Crash au chargement (`c0000005`, data file mounter).** Cause : `<Item type="CWeaponInfo">` placé au mauvais index (0 au lieu de 1) dans `<Infos>` (tableau à index fixes par catégorie). Fix : restructuré pour matcher le squelette de `soz-weapon-pickaxe`.
- **2026-08-13 — Retour utilisateur : le crash a disparu, mais l'arme ne s'équipe pas.** Le prop cosmétique du torse s'affiche (système séparé, indépendant de l'arme native) mais l'arme ne se met jamais en main (flicker en boucle, `onCheck()` détecte l'incohérence). Cause suspectée : réutilisation du slot vanilla `SLOT_ASSAULTSMG`. Fix tenté : slot dédié `SLOT_ASSAULTSMG_TRAINING`.
- **2026-08-13 — Retour utilisateur : toujours rien, 0 logs, la vraie P90 marche sans problème.** Le fix de slot n'a pas suffi. **Vrai diagnostic** : `WEAPON_ASSAULTSMG_TRAINING` est un nom d'arme totalement inédit, sans `weaponanimations.meta` associé — introuvable dans ce repo (les vraies données d'animation de la P90 sont compilées dans le jeu de base). `WEAPONINFO_FILE_PATCH` fonctionne pour `WEAPON_EMPLAUNCHER`/`WEAPON_SNOWBALL` car ce sont de vraies armes DLC Rockstar déjà connues du moteur (juste désactivées par défaut) — pas notre cas.
- **2026-08-13 — Retour utilisateur : refonte temporaire.** Faute d'accès aux vraies données d'animation, repli sur la **vraie** `WEAPON_ASSAULTSMG` (équipement 100% fiable) + teinte orange forcée + distinction faux/vrai tir via un **State Bag** répliqué (`isUsingTrainingWeapon`) lu par la victime au moment de l'impact. Effet de bord documenté à l'époque : risque sécurité plus élevé (un client triché pourrait potentiellement s'immuniser contre de vraies balles de P90 en court-circuitant la vérification du state bag), recommandation d'usage réservé aux events supervisés.
- **2026-08-13 — Utilisateur fournit les vrais `weapons.meta`/`weaponanimations.meta` du jeu de base.** Extraits via un outil externe (type OpenIV/CodeWalker) et déposés à la racine du repo. Objectif : reconstruire un hash dédié fiable, l'utilisateur s'inquiétant aussi d'éventuels problèmes liés au partage d'ammo/hash avec la vraie arme (clarifié : pas un risque réel, chaque munition est déjà restreinte à son item via la validation serveur existante — la vraie motivation du repli était la sécurité/fiabilité, pas les munitions).
- **2026-08-13 — Reconstruction finale (état actuel).** Extraction scriptée (Python, dépendance de comptage de profondeur XML, pas de transcription manuelle) des entrées réelles `WEAPON_ASSAULTSMG` dans `weaponanimations.meta` pour les sets `Default`, `MP_F_Freemode`, `FirstPerson`, `FirstPersonAiming` (3 sous-entrées), renommées `WEAPON_ASSAULTSMG_TRAINING`. Nouvelle resource `soz-weapon-assaultsmg-training` reconstruite en `WEAPONINFO_FILE` (pas `_PATCH`, contenu additif complet) + `WEAPON_ANIMATIONS_FILE` + `CONTENT_UNLOCKING_META_FILE`, sur le modèle de `soz-weapon-pickaxe`. Retour à un hash dédié dans `shared/weapons/weapon.ts` (suppression de `nativeWeapon`/State Bag pour cette arme, `forcedTint: Orange` conservé). `client/weapon/training.weapon.provider.ts` repasse au filtrage par hash dédié pur (plus besoin de vérifier l'attaquant). Fichiers `.meta` sources du jeu de base supprimés du repo après extraction (copyright, taille, repo `oss`). **Pas encore testée en jeu.**
- **2026-08-13 — Retour utilisateur : équipement et animations confirmés en jeu.** L'arme s'équipe correctement et s'anime sans souci (plus de flicker, pas de T-pose). La reconstruction avec les vraies données d'animation a résolu le blocage. Checklist de tests de dégâts/compteur virtuel ajoutée au document (section [Checklist de tests](#checklist-de-tests--dégâts-et-compteur-virtuel)) avant que l'utilisateur passe sur une autre branche — **reste à dérouler ces tests et rapporter les résultats à la reprise**.
