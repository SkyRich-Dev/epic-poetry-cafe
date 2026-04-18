#!/bin/bash
set -e
pnpm install
pnpm --filter @workspace/db exec drizzle-kit push --force --config ./drizzle.config.ts
