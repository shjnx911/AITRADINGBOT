#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h db -U postgres; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is up - continuing"

# Apply database migrations
echo "Applying database migrations..."
npm run db:push

# Start the application
echo "Starting application in $NODE_ENV mode..."
if [ "$NODE_ENV" = "production" ]; then
  # In production, start the optimized build
  node dist/server/index.js
else
  # In development, use Vite for hot reloading
  npm run dev
fi