#!/bin/bash
# ------------------------------------------------------------------------
# This script attempt to start athena with some placeholder settings just to make sure it runs
# ------------------------------------------------------------------------

# export these values so the subshell running athena will be able to see them
export HOST_URL="${HOST_URL:=http://localhost:3000}"
export DB_SYSTEM="${DB_SYSTEM:=athena_system}"
export DB_CONNECTION_STRING="${DB_CONNECTION_STRING:=http://localhost:5984}"

echo "HOST_URL=$HOST_URL"
echo "DB_SYSTEM=$DB_SYSTEM"
echo "DB_CONNECTION_STRING=$DB_CONNECTION_STRING"

echo "Start Athena as a background process"
node ../../packages/athena/app.js &
NODE_PID=$!

i=0
while [[ "$status" != "204" && "$i" -lt "5" ]]; do #loop a few times
  echo "Sleep $((i*2+4))s before checking Athena $([[ $i -gt 0 ]] && echo "again $i" || echo "$i")"
  sleep $((i*2+4))s
  ((i+=1))
  status=$(curl -LI $HOST_URL -o /dev/null -w '%{http_code}\n' -s || true)
  echo "Curl response status: $status"
done

echo "Killing background athena process: $NODE_PID"
ps -f
kill -9 $NODE_PID || true

echo "Stop Travis"
if [ "$status" == 204 ]; then
  echo "athena responded w/204"
else
  echo "athena did not respond w/204. ${status}"
  exit 1
fi
