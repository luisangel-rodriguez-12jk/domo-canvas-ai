#!/usr/bin/env bash
set -euo pipefail

OWNER="${GITHUB_OWNER:-luisangel-rodriguez-12jk}"
REPO="${GITHUB_REPO:-domo-canvas-ai}"
VISIBILITY="${GITHUB_VISIBILITY:-public}"
TAG="${RELEASE_TAG:-v0.1.0}"

TOKEN_FILE="${HOME}/.hermes/secrets/domo_github_token"
if [[ -f "$TOKEN_FILE" ]]; then
  # Preferimos el token guardado para evitar usar por accidente un GITHUB_TOKEN viejo de la sesión.
  GITHUB_TOKEN="$(python3 - <<PY
from pathlib import Path
text = Path('$TOKEN_FILE').read_text(errors='ignore').strip()
if len(text) >= 2 and ((text[0] == text[-1] == "'") or (text[0] == text[-1] == '"')):
    text = text[1:-1].strip()
print(text, end='')
PY
)"
elif [[ -n "${GITHUB_TOKEN:-}" ]]; then
  GITHUB_TOKEN="$(printf '%s' "$GITHUB_TOKEN" | python3 -c "import sys; t=sys.stdin.read().strip(); print(t[1:-1].strip() if len(t)>=2 and t[0]==t[-1] and t[0] in '\"\\'' else t, end='')")"
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Falta GITHUB_TOKEN." >&2
  echo "Opción recomendada: ./scripts/save-github-token-local.sh" >&2
  echo "También puedes usar: export GITHUB_TOKEN='tu_token_local'" >&2
  echo "Genera el token en https://github.com/settings/tokens con scopes repo + workflow." >&2
  exit 1
fi

user_status=$(curl -sS -o /tmp/domo-github-user.json -w '%{http_code}' \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user)
if [[ "$user_status" != "200" ]]; then
  echo "El token guardado no autentica contra GitHub. HTTP $user_status" >&2
  python3 - <<'PY' >&2
import json
from pathlib import Path
try:
    data=json.loads(Path('/tmp/domo-github-user.json').read_text())
    print(data.get('message', 'Sin mensaje de GitHub'))
except Exception:
    print('No pude leer la respuesta de GitHub')
PY
  echo "Vuelve a guardar un token clásico con scopes repo + workflow usando ./scripts/save-github-token-local.sh" >&2
  exit 1
fi

create_payload=$(python3 - <<PY
import json, os
print(json.dumps({
  "name": os.environ.get("GITHUB_REPO", "domo-canvas-ai"),
  "description": "Domo Canvas AI - editor de diseños de playeras con IA, capas y auto-updates.",
  "private": os.environ.get("GITHUB_VISIBILITY", "public") != "public",
  "has_issues": True,
  "has_projects": False,
  "has_wiki": False,
}))
PY
)

status=$(curl -sS -o /tmp/domo-create-repo.json -w '%{http_code}' \
  -X POST \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "$create_payload")

if [[ "$status" != "201" && "$status" != "422" ]]; then
  echo "GitHub respondió HTTP $status al crear repo:" >&2
  python3 -m json.tool /tmp/domo-create-repo.json >&2 || cat /tmp/domo-create-repo.json >&2
  exit 1
fi

if [[ "$status" == "201" ]]; then
  echo "Repo creado: https://github.com/${OWNER}/${REPO}"
else
  echo "Repo ya existía o GitHub devolvió 422; continúo con push."
fi

git remote set-url origin "https://github.com/${OWNER}/${REPO}.git"

# Usa el token solo para esta invocación de git, sin guardarlo en origin ni en .git/config.
# Git sobre HTTPS espera Basic auth: usuario ficticio x-access-token + token como password.
GIT_AUTH_HEADER="Authorization: Basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 | tr -d '\n')"
git -c "http.https://github.com/.extraheader=${GIT_AUTH_HEADER}" push -u origin main

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG ya existe localmente."
else
  git tag "$TAG"
fi

git -c "http.https://github.com/.extraheader=${GIT_AUTH_HEADER}" push origin "$TAG"

echo "Listo. Revisa GitHub Actions en: https://github.com/${OWNER}/${REPO}/actions"
