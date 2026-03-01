#!/bin/sh
set -e

# Seed new knowledge-base files from the image into the volume, without
# overwriting files the user has already added or modified.
if [ -d "/app/knowledge-base-seed" ] && [ -d "/app/knowledge-base" ]; then
  echo "Syncing knowledge-base seed files..."
  find /app/knowledge-base-seed -type f | while read src; do
    rel="${src#/app/knowledge-base-seed/}"
    dest="/app/knowledge-base/$rel"
    destdir="$(dirname "$dest")"
    if [ ! -f "$dest" ]; then
      mkdir -p "$destdir"
      cp "$src" "$dest"
      echo "  Added: $rel"
    fi
  done
fi

echo "Running Prisma migrations..."
./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting application..."
exec node server.js
