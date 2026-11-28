# Kevspire — la tour des lucioles

Tower defense **vertical** original, pensé pour le téléphone et le doigt.

Dans l'Archipel des Brises, la Flèche est une tour vivante qui **grandit d'un étage après chaque vague**. À son sommet brille le Cœur d'Aube. La nuit, les Brumâmes (créatures d'encre et de brume) arrivent **de partout** : elles escaladent les murs des deux côtés, foncent depuis le ciel, ou creusent sous l'île pour surgir à mi-hauteur.

## Jouer

```bash
npm install
npm run dev        # puis ouvrir l'adresse affichée (aussi depuis un téléphone sur le même réseau : npm run dev -- --host)
```

- **Toucher un balcon** : menu radial des 5 tourelles. Premier appui = aperçu (portée + fiche), second appui = construction.
- **Toucher une tourelle** : améliorer (3 niveaux) ou revendre (70 %).
- **Glisser** : faire défiler la tour. Molette sur ordinateur.
- **Éclat d'aube** : touche le bouton puis la zone à frapper (étourdit et brûle). **Rafale** : fait redescendre les grimpeurs d'un étage et repousse les volants.
- **Appeler la vague en avance** rapporte de l'or.
- Après chaque vague, **choisis le nouvel étage** parmi 3 : Atelier (+25 % de cadence), Belvédère (+18 % de portée), Rempart de ronces (grimpeurs ralentis), Comptoir (+20 or par vague), Sanctuaire (+1 vie par vague).

### Contenu

| | |
|---|---|
| Tourelles | Baliste, Cloche de givre, Mortier à braises, Phare (rayon qui chauffe), Bobine d'orage (éclair en chaîne), 3 niveaux chacune |
| Brumâmes | Grignot, Papillombre, Carapace, Fouisseur, Moucheron d'essaim, Planeur spectral (endort les tourelles), Mère-Brume (boss) |
| Campagne | 9 niveaux sur 3 ambiances (Crépuscule, Nuit, Orage d'aube), étoiles, bestiaire |
| Méta | Atelier : 6 améliorations permanentes payées en éclats d'aube |
| Rejouabilité | Ascension infinie (record sauvegardé) |

## Qualité

| Commande | Rôle |
|---|---|
| `npm run typecheck` | TypeScript strict (`noUncheckedIndexedAccess`, etc.) |
| `npm run lint` | ESLint, fichiers limités à 400 lignes (pas de fichier-dieu) |
| `npm test` | 188 tests Vitest, dont **la campagne entière jouée par le bot** et son **rejeu à l'identique** |
| `npm run balance` | Audit d'équilibrage headless : chaque niveau gagné par le bot sur 5 graines, perdu par un joueur passif ou paresseux (`-- --check` échoue sinon, lancé en CI) |
| `npm run e2e` | Playwright sur un Pixel 7 émulé : parcours joueur, **gestes tactiles réels** (poser, améliorer, vendre, faire défiler), onglet caché, résolution plafonnée, campagne complète dans le vrai jeu (`PW_PORT` pour changer de port) |
| `npm run verify` | Tout ce qui précède sauf l'e2e |

La CI GitHub Actions bloque sur le typage, le lint, les tests, l'audit d'équilibrage, le build et les tests de bout en bout.

## Architecture

```
src/
  core/      types partagés, RNG déterministe sérialisable, maths
  data/      données pures : tourelles, Brumâmes, étages, niveaux, géométrie
  sim/       simulation déterministe à pas fixe, sans DOM (testable et rejouable)
  bot/       joueur automatique qui n'utilise que les commandes du joueur
  meta/      étoiles, éclats, améliorations de l'atelier
  save/      sauvegarde versionnée : migrations, somme de contrôle FNV-1a, copie de secours, nettoyage
  render/    rendu Canvas 2D : caméra verticale, tour, Brumâmes, particules en réserve, effets
  audio/     musique générative et sons synthétisés en WebAudio (aucun fichier audio)
  ui/        écrans et HUD en DOM, menu radial, fenêtres
  game/      session de jeu : boucle, entrées tactiles, liaison simulation ↔ rendu ↔ interface
```

- **Simulation** : état 100 % JSON (reprise de partie exacte), pas fixe de 1/60 s, événements consommés par le rendu et l'audio.
- **Rejeu déterministe** (`sim/replay.ts`) : chaque commande du joueur est une donnée horodatée en pas de simulation ; `playReplay` rejoue une partie depuis son état de départ et `verifyReplay` compare l'empreinte finale. La session en cours expose son journal (`window.__kevspire.session.replay`) pour reproduire un bug.
- **Sauvegarde** : enveloppe `{sum, data}`, migration v1 → v2 testée, repli automatique sur la copie de secours, partie en cours sauvegardée à chaque vague et validée champ par champ à la lecture (`save/runCheck.ts`), sauvegarde illisible mise en quarantaine plutôt qu'écrasée, stockage plein ou indisponible géré.
- **Perf mobile** : réserves de projectiles, de Brumâmes et de particules (aucun objet alloué par tir ni par apparition, vérifié par les tests), boucle de simulation et de rendu sans allocation par image, halos pré-rendus, images WebP redimensionnées, résolution plafonnée et **qualité auto** qui baisse résolution et effets si le téléphone peine, pause automatique et boucle d'affichage arrêtée en arrière-plan.

## Direction artistique

Illustration peinte « crépuscule chaleureux » : bois miel, laiton et pierre crème pour la tour et les Gardiens, encre indigo et yeux cyan pour les Brumâmes. Les images ont été générées avec Codex à partir d'une bible de style commune (voir `tools/art/`), puis optimisées par `npm run assets <dossier>`.

Polices : Fraunces (titres) et Nunito (interface), embarquées.
