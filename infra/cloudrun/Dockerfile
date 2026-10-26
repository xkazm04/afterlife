# syntax=docker/dockerfile:1
# Afterlife hosted replay (infra/cloudrun/README.md, "The replay's security contract").
# Build from the repo root:  docker build -f infra/cloudrun/Dockerfile -t afterlife-replay .
# The build context is filtered by infra/cloudrun/Dockerfile.dockerignore.

ARG NODE_IMAGE=node:24-bookworm-slim

# 1. Dependencies: a clean install from the lockfile (never the host's node_modules).
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# The committed lock lacks @emnapi/runtime and @emnapi/core (needed by the optional @img/sharp-wasm32), so a Linux
# npm ci refuses it. Fill in only the missing entries inside the image (every pinned version stays), then install
# exactly that lock. Drop the first command once package-lock.json is regenerated at the repo root.
RUN npm install --package-lock-only --no-audit --no-fund  && npm ci --no-audit --no-fund

# 2. Build: next build with output: 'standalone' (next.config.ts).
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Runtime: the standalone server only. No glab, no token, no AFTERLIFE_* but AFTERLIFE_MODE, no volume,
#    AFTERLIFE_DATA_DIR unset (contract items 1, 2, 4). The files stay root-owned: the node user can read, not rewrite them.
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    AFTERLIFE_MODE=replay \
    HOSTNAME=0.0.0.0 \
    PORT=8080
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# F98: demo reads <cwd>/policy/trust-policy.yml; without it the Ladder draws no thresholds.
COPY --from=build /app/policy ./policy
USER node
EXPOSE 8080
# F24: the standalone server reads HOSTNAME and PORT (Cloud Run sets PORT). Never npm start or next dev.
CMD ["node", "server.js"]
