# Génération des images (Codex)

1. `bash ecrire_prompts.sh` écrit la bible de style (`prompts/_ADN.txt`) et un prompt par image.
2. `bash tout.sh` lance Codex (4 générations en parallèle) ; chaque image arrive dans `out/`.
3. `npm run assets tools/art/out` convertit en WebP optimisé dans `public/assets/`.

Chaque prompt est préfixé par la même bible de style pour garder une direction artistique cohérente.
