#!/usr/bin/env bash
# Sobe backend (Spring Boot :8080) e frontend (Vite :5173) juntos.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export JAVA_HOME="${JAVA_HOME:-$HOME/.jdks/temurin21/jdk-21.0.13.1+2}"

if [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "JDK 21 não encontrado em $JAVA_HOME. Ajuste JAVA_HOME." >&2
  exit 1
fi

cleanup() {
  echo ""
  echo "Encerrando serviços..."
  [ -n "${BACK_PID:-}" ] && kill "$BACK_PID" 2>/dev/null || true
  [ -n "${FRONT_PID:-}" ] && kill "$FRONT_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "▶ Backend  → http://localhost:8080"
( cd "$ROOT/backend" && JAVA_HOME="$JAVA_HOME" mvn -q spring-boot:run -Dspring-boot.run.profiles=dev ) &
BACK_PID=$!

# espera o backend aceitar conexões (até 120s)
for i in $(seq 1 120); do
  if python3 -c "import socket,sys; s=socket.socket(); s.settimeout(1); sys.exit(0 if s.connect_ex(('127.0.0.1',8080))==0 else 1)" 2>/dev/null; then
    echo "✔ Backend no ar"
    break
  fi
  sleep 1
done

echo "▶ Frontend → http://localhost:5173"
( cd "$ROOT/frontend" && npm run dev -- --host ) &
FRONT_PID=$!

wait
