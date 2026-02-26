FROM node:22-slim

RUN corepack enable

WORKDIR /app

# Copy package manifests for dependency install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

# Install deps (tsx needed for runtime TS execution)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Expose port
ENV PORT=3000
EXPOSE 3000

# Run LINE AI Partner standalone server via tsx
CMD ["node", "--import", "tsx", "src/line-ai-partner/server.ts"]
