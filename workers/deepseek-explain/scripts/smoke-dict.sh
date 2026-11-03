#!/bin/sh
# Dictionary smoke. Does not deploy the Worker.
# After Nest deploys, this POSTs mode "dict" and expects HTTP 200
# with one or two senses for "however".
#
#   ./scripts/smoke-dict.sh
#   WORKER_URL=https://deepseek-explain.skhhcss-eng.workers.dev ./scripts/smoke-dict.sh
set -eu
URL="${WORKER_URL:-https://deepseek-explain.skhhcss-eng.workers.dev}"
body=$(curl -sS -w "\n%{http_code}" \
  -X POST "$URL" \
  -H "Origin: https://skhhcss-eng.github.io" \
  -H "Content-Type: application/json" \
  --data '{"mode":"dict","word":"however"}')
status=$(printf '%s\n' "$body" | tail -n 1)
json=$(printf '%s\n' "$body" | sed '$d')
printf '%s\n' "$json"
echo "HTTP $status"
if [ "$status" != "200" ]; then
  echo "Expected 200 from $URL" >&2
  exit 1
fi
printf '%s' "$json" | node -e '
let raw = "";
process.stdin.on("data", function (chunk) { raw += chunk; });
process.stdin.on("end", function () {
  const data = JSON.parse(raw);
  const n = data && Array.isArray(data.senses) ? data.senses.length : 0;
  if (n < 1 || n > 2) {
    console.error("Expected 1 or 2 senses, got " + n);
    process.exit(1);
  }
  if (!data.reply || data.reply.indexOf("however") === -1) {
    console.error("Reply did not name however");
    process.exit(1);
  }
  console.log("senses: " + n);
});
'
