#!/bin/bash
# Self-daemonizing dev server starter
# Double-fork + setsid to fully detach from the parent shell session
cd /home/z/my-project

# Kill any existing instance
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 2

# Start in a new session, fully detached
setsid bash -c 'cd /home/z/my-project && exec bun run dev' </dev/null >>/home/z/my-project/dev.log 2>&1 &

# Disown so the shell doesn't send SIGHUP
disown
echo "Dev server started, PID: $!"
sleep 3
