#!/bin/sh
# Fly mounts volumes as root. Make the resume directory writable by the
# unprivileged app user, then drop privileges before starting the server.
set -e
RESUME_DIR="${RESUME_STORAGE_ROOT:-/app/var/jobtrackr-resumes}"
mkdir -p "$RESUME_DIR"
chown -R node:node "$RESUME_DIR"
exec runuser -u node -- "$@"
