# =============================================================
# HyprCAT Platform - Combined Fly.io Dockerfile
# Serves frontend (nginx :8080) + API (node :3001) in one image
# =============================================================

# --- Stage 1: Build everything ---
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy workspace config + all package.jsons for dependency caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/protocol/package.json packages/protocol/
COPY packages/sdk/package.json packages/sdk/
COPY packages/server/package.json packages/server/
COPY packages/agent-runtime/package.json packages/agent-runtime/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy all source
COPY . .

# Build backend (protocol + server)
RUN pnpm --filter @hyprcat/protocol build && pnpm --filter @hyprcat/server build

# Build frontend (Vite → /app/dist)
RUN pnpm build

# --- Stage 2: Production image (nginx + node) ---
FROM node:22-alpine AS production
WORKDIR /app

# Install nginx and supervisor to run both processes
RUN apk add --no-cache nginx supervisor

# Copy built API server + dependencies
COPY --from=build /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=build /app/packages/protocol/package.json packages/protocol/
COPY --from=build /app/packages/protocol/dist packages/protocol/dist/
COPY --from=build /app/packages/server/package.json packages/server/
COPY --from=build /app/packages/server/dist packages/server/dist/
COPY --from=build /app/node_modules node_modules/
COPY --from=build /app/packages/server/node_modules packages/server/node_modules/

# Copy built frontend static files
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx config - listen on 8080, proxy API to :3001
RUN cat > /etc/nginx/http.d/default.conf << 'NGINX'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # Proxy direct gateway endpoints
    location ~ ^/(health|ready|catalog|resources|operations|auth|wallet|profile|federation|\.well-known) {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

# Supervisor config to run both nginx and node
RUN cat > /etc/supervisord.conf << 'SUPERVISOR'
[supervisord]
nodaemon=true
logfile=/dev/stdout
logfile_maxbytes=0
loglevel=info

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:api]
command=node packages/server/dist/index.js
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV="production",PORT="3001",HOST="0.0.0.0",STORAGE_BACKEND="file",STORAGE_DIR="/data"
SUPERVISOR

# Create data directory
RUN mkdir -p /data

ENV NODE_ENV=production

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
