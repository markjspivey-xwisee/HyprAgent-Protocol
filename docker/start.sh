#!/bin/sh
mkdir -p /data /run/nginx /var/log/nginx /tmp/nginx

# Start nginx in background
nginx -g "daemon off;" &
NGINX_PID=$!

# Start API server
cd /app
NODE_ENV=production PORT=3001 HOST=0.0.0.0 STORAGE_BACKEND=file STORAGE_DIR=/data node packages/server/dist/index.js &
API_PID=$!

# Wait for either process to exit
wait -n $NGINX_PID $API_PID
EXIT_CODE=$?

# Kill remaining process
kill $NGINX_PID $API_PID 2>/dev/null
exit $EXIT_CODE
