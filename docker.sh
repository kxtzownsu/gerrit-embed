#!/bin/bash

set -euo pipefail

CONTAINER_NAME="gerrit-embed"
IMAGE_NAME="gerrit-embed-image"
PORT="${PORT:-3000}"
DOCKER_NETWORK="${DOCKER_NETWORK:-host}"
APP_DIR="/app"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env does not exist."
  exit 1
fi

cat <<EOF > "$SCRIPT_DIR/Dockerfile"
FROM node:24-alpine

RUN npm install -g pnpm

WORKDIR $APP_DIR

COPY package.json pnpm-lock.yaml $APP_DIR/

RUN pnpm install --prod --frozen-lockfile

COPY src $APP_DIR/src
COPY .env $APP_DIR/.env

RUN chmod 400 $APP_DIR/.env

EXPOSE $PORT

CMD ["node", "src/app.mjs"]
EOF

echo "Building Docker image..."
docker build --network "$DOCKER_NETWORK" -t "$IMAGE_NAME" "$SCRIPT_DIR"

echo "Removing old container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "Running Docker container..."
DOCKER_PORT_ARGS=()

if [ "$DOCKER_NETWORK" != "host" ]; then
  DOCKER_PORT_ARGS=(-p "$PORT:$PORT/tcp")
fi

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --network "$DOCKER_NETWORK" \
  "${DOCKER_PORT_ARGS[@]}" \
  -e "PORT=$PORT" \
  --security-opt=no-new-privileges \
  --cap-drop ALL \
  --read-only \
  "$IMAGE_NAME"

echo "App is now running on port $PORT."

# TODO(kxtz): this should only show if the two ports don't match.
# Or maybe we just don't even run the docker container if it doesn't match?
if [ -f "$ENV_FILE" ]; then
  echo "$ENV_FILE specified the following port:"
  grep 'PORT=' "$ENV_FILE" | awk '{print $1}'
  echo "Please ensure these two ports (running port & env port) match!"
  echo "To change the running port, pass PORT=<port> to the docker.sh script."
  echo "To change the env port, change the PORT= line in $ENV_FILE to be your desired port."
fi