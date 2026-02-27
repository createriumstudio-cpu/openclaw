#!/usr/bin/env bash
# LINE AI Partner – Deploy to Fly.io
#
# Usage:
#   ./deploy/deploy.sh
#
# Prerequisites:
#   - flyctl installed: curl -L https://fly.io/install.sh | sh
#   - flyctl authenticated: fly auth login
#   - FLY_API_TOKEN set (or logged in via browser)

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "==> Deploying LINE AI Partner to Fly.io..."
flyctl deploy -c deploy/fly.toml --dockerfile deploy/Dockerfile --remote-only --yes "$@"
echo "==> Deploy complete!"
echo "    Health check: https://openclaw-line-ai-partner.fly.dev/health"
echo "    Webhook URL:  https://openclaw-line-ai-partner.fly.dev/webhook"
