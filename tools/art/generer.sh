#!/usr/bin/env bash
# Génère une image avec Codex -> out/<ID>.png (lit prompts/ID.txt, préfixé par prompts/_ADN.txt)
set -uo pipefail
cd "$(dirname "$0")"
CODEX="/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex"
[[ -x "$CODEX" ]] || CODEX="$(command -v codex)"
ID="$1"
mkdir -p out logs
TRAVAIL="$(mktemp -d)"
{
  echo "Utilise ton outil de génération d'images pour produire UNE image. N'écris pas de code et ne lance aucune commande. Quand l'image est produite, réponds seulement : FAIT."
  echo
  cat prompts/_ADN.txt
  echo
  cat "prompts/$ID.txt"
} > "$TRAVAIL/prompt.txt"
( cd "$TRAVAIL" && "$CODEX" exec --skip-git-repo-check -s read-only --json - < prompt.txt > sortie.jsonl 2> err.txt )
cp "$TRAVAIL/sortie.jsonl" "logs/$ID.jsonl"
SESSION="$(grep -o '"thread_id":"[^"]*"' "$TRAVAIL/sortie.jsonl" | head -1 | cut -d'"' -f4)"
IMAGE="$(ls -t "$HOME/.codex/generated_images/$SESSION"/*.png 2>/dev/null | head -1 || true)"
if [[ -z "$IMAGE" ]]; then echo "ECHEC $ID" >> logs/etat.txt; exit 1; fi
cp "$IMAGE" "out/$ID.png"
echo "OK $ID" >> logs/etat.txt
