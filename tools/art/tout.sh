#!/usr/bin/env bash
# Lance toutes les générations manquantes, 4 en parallèle.
cd "$(dirname "$0")"
chmod +x generer.sh
ls prompts/*.txt | grep -v _ADN | xargs -n1 basename | sed 's/\.txt$//' | while read -r ID; do
  [[ -f "out/$ID.png" ]] || echo "$ID"
done | xargs -P 4 -I{} ./generer.sh {}
