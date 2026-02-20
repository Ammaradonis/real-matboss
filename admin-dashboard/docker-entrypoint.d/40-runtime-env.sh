#!/bin/sh
set -eu

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > /usr/share/nginx/html/runtime-env.js <<'EOF'
window.__RUNTIME_CONFIG__ = {};
EOF

if [ -n "${VITE_API_URL:-}" ]; then
  escaped_api_url="$(escape_js "$VITE_API_URL")"
  printf 'window.__RUNTIME_CONFIG__.VITE_API_URL = "%s";\n' "$escaped_api_url" >> /usr/share/nginx/html/runtime-env.js
fi

if [ -n "${VITE_TENANT_ID:-}" ]; then
  escaped_tenant_id="$(escape_js "$VITE_TENANT_ID")"
  printf 'window.__RUNTIME_CONFIG__.VITE_TENANT_ID = "%s";\n' "$escaped_tenant_id" >> /usr/share/nginx/html/runtime-env.js
fi
