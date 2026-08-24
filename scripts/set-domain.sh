#!/usr/bin/env bash
# Switch the portfolio's canonical and social metadata to a real domain.
# Usage: scripts/set-domain.sh kevinedwards.dev
set -euo pipefail
DOMAIN="${1:?usage: set-domain.sh <domain, no protocol>}"
cd "$(dirname "$0")/.."
OLD="https://kevin-edwards-portfolio.netlify.app"
NEW="https://${DOMAIN}"
sed -i '' "s|${OLD}|${NEW}|g" index.html
echo "metadata now points at ${NEW}"
grep -c "${NEW}" index.html | xargs -I{} echo "references updated: {}"
echo "next: netlify deploy --prod --dir=."
