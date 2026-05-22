#!/bin/bash

APP_NAME="roadside-server"
PORT=3000
ECOSYSTEM="ecosystem.config.js"

# ----------------- Kill any leftover process on the port -----------------
PID=$(lsof -ti tcp:$PORT)
if [ ! -z "$PID" ]; then
    echo "Found process $PID using port $PORT, killing it..."
    kill -9 $PID

    # Wait a few seconds for port to free up
    echo "Waiting 3 seconds for port $PORT to be released..."
    sleep 3
else
    echo "No process found on port $PORT"
fi

# ----------------- Start PM2 using ecosystem file -----------------
echo "Starting PM2 app $APP_NAME..."
pm2 delete $APP_NAME 2>/dev/null
pm2 start $ECOSYSTEM --only $APP_NAME

# ----------------- Save PM2 process list -----------------
pm2 save

echo "✅ $APP_NAME is running under PM2"
pm2 list
