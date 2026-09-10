# Multi-stage build: compile the Angular app, then run it from a slim
# Express runtime image. Matches the fais-app pattern on the Hetzner box
# (Node/Express serving a built Angular app as static files from the same
# container that hosts the API) — see hetzner-infra/hetzner.md.

# ---- Stage 1: build the Angular app ----
FROM node:22-alpine AS build
WORKDIR /app

# root package.json also lists puppeteer as a dependency (used only by
# scripts/collect_console.js, a local dev tool) — skip its ~300MB Chromium
# download during the build, it's never invoked here.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN ./node_modules/.bin/ng build --configuration production

# ---- Stage 2: runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only the server's own dependencies ship in the runtime image (express,
# mongoose, bcrypt, jsonwebtoken, body-parser) — the Angular toolchain and
# puppeteer from the build stage are discarded.
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server/server.js"]
