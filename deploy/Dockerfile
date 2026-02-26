FROM node:22-slim

RUN corepack enable

WORKDIR /app

# Copy package manifests for dependency install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

# Install deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Bundle server into a single ESM file to avoid tsx __name helper bug
# (see docs/debug/node-issue.md). npm packages stay external (resolved from node_modules).
RUN pnpm exec esbuild src/line-ai-partner/server.ts \
      --bundle --platform=node --format=esm \
      --outfile=dist/line-server.mjs \
      --packages=external

# Expose port
ENV PORT=3000
EXPOSE 3000

# Run bundled server with plain Node (no tsx)
CMD ["node", "dist/line-server.mjs"]
