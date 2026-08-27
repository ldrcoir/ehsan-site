#!/bin/bash
cd /home/z/my-project
while true; do
  if ! pgrep -f "next-server" > /dev/null; then
    echo "[$(date)] Starting next-server..."
    node node_modules/next/dist/bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
    disown
  fi
  sleep 10
done
