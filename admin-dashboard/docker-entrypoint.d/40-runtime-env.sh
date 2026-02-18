#!/bin/sh
set -eu

cat > /usr/share/nginx/html/runtime-env.js <<EOF
window.__RUNTIME_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-}",
  VITE_TENANT_ID: "${VITE_TENANT_ID:-}"
};
EOF
