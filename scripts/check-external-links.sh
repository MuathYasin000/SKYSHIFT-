#!/usr/bin/env bash
# Requires Python 3 and curl. Uses normal TLS verification; no authentication.
set -euo pipefail
cd "$(dirname "$0")/.."
python_bin="${SKYSHIFT_PYTHON:-python}"
output="${1:-tmp/link-audit/external-links.tsv}"
mkdir -p "$(dirname "$output")"
url_list="$(mktemp)"
trap 'rm -f "$url_list"' EXIT
"$python_bin" scripts/extract_external_links.py web/dist | tr -d '\r' > "$url_list"
export SKYSHIFT_LINK_OUTPUT="$output"
# Keep original URL next to final status, including failures/timeouts (000).
cat "$url_list" | tr '\n' '\0' | xargs -0 -P 8 -I '{}' bash -c '
  url="$1"
  result=$(curl -sIL -o /dev/null -w "%{http_code} %{url_effective}\n" --connect-timeout 5 --max-time 20 "$url" 2>/dev/null) || true
  printf "%s\t%s\n" "$url" "$result"
' _ '{}' > "$output"
echo "Non-200/non-3xx responses (HEAD, redirects followed; 000 = transport failure):"
awk -F '\t' '$2 !~ /^(200|3[0-9][0-9]) /' "$output"
echo "Complete results: $output"
