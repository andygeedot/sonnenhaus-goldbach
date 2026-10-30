#!/usr/bin/env bash
# Startet das Schaufenster auf einem Linux-Rechner am Bildschirm (z. B. Raspberry Pi 4/5 mit Raspberry Pi OS).
# Einmal bauen: npm ci && npm run build   – danach reicht dieses Skript, auch ohne Internet.
# Autostart: siehe README, Abschnitt „Schaufenster“.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=4173
URL="http://localhost:${PORT}/kiosk.html?loop"   # ?loop: am Außen-Display endlos wiederholen

# fertige Seite lokal ausliefern (nur auf diesem Rechner erreichbar)
npx vite preview --port "$PORT" --strictPort --host 127.0.0.1 >/tmp/sonnenhaus-preview.log 2>&1 &
trap 'kill $! 2>/dev/null' EXIT
until curl -fs "$URL" >/dev/null; do sleep 1; done

# Bildschirm nicht abschalten
xset s off -dpms 2>/dev/null || true

BROWSER=$(command -v chromium || command -v chromium-browser || command -v google-chrome)
exec "$BROWSER" --kiosk "$URL" \
  --noerrdialogs --disable-infobars --no-first-run --disable-session-crashed-bubble \
  --overscroll-history-navigation=0 --disable-pinch --check-for-update-interval=31536000 \
  --autoplay-policy=no-user-gesture-required
