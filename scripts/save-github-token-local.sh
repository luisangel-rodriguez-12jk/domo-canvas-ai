#!/usr/bin/env bash
set -euo pipefail

SECRET_DIR="${HOME}/.hermes/secrets"
SECRET_FILE="${SECRET_DIR}/domo_github_token"

mkdir -p "$SECRET_DIR"
chmod 700 "$SECRET_DIR"

printf 'Pega tu GitHub token localmente (no se mostrará): '
IFS= read -r -s token
printf '\n'

if [[ -z "$token" ]]; then
  echo "Token vacío; no guardé nada." >&2
  exit 1
fi

# Evita saltos de línea/espacios accidentales.
printf '%s' "$token" > "$SECRET_FILE"
chmod 600 "$SECRET_FILE"

echo "Token guardado localmente en $SECRET_FILE con permisos 600."
echo "No se sube a GitHub y publish-github.sh lo usará si GITHUB_TOKEN no está exportado."
