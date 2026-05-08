#!/usr/bin/env bash
set -euo pipefail

OWNER="${GITHUB_OWNER:-luisangel-rodriguez-12jk}"
REPO="${GITHUB_REPO:-domo-canvas-ai}"
VISIBILITY="${GITHUB_VISIBILITY:-public}"
TAG="${RELEASE_TAG:-v0.1.0}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Falta GITHUB_TOKEN. Genera un token en https://github.com/settings/tokens con scopes repo + workflow." >&2
  echo "Luego ejecuta: export GITHUB_TOKEN='tu_token_local'" >&2
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
git push -u origin main

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG ya existe localmente."
else
  git tag "$TAG"
fi

git push origin "$TAG"

echo "Listo. Revisa GitHub Actions en: https://github.com/${OWNER}/${REPO}/actions"
