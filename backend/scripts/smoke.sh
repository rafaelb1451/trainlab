#!/usr/bin/env bash
# Smoke test real do backend TrainLab.
# Sobe a API com Maven, valida os endpoints principais usando python3 (sem curl)
# e garante que o processo Java seja encerrado ao final.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export JAVA_HOME="${JAVA_HOME:-/home/rafael/.jdks/temurin21/jdk-21.0.13.1+2}"
export PATH="$JAVA_HOME/bin:$PATH"
PORT="${TRAINLAB_PORT:-8080}"
BASE_URL="http://127.0.0.1:${PORT}"
LOG_FILE="${ROOT_DIR}/target/smoke-backend.log"
APP_PID=""

if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "[smoke] ERRO: JAVA_HOME inválido: $JAVA_HOME" >&2
  exit 1
fi
if ! command -v mvn >/dev/null 2>&1; then
  echo "[smoke] ERRO: mvn não encontrado no PATH" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "[smoke] ERRO: python3 não encontrado no PATH" >&2
  exit 1
fi

if python3 -c 'import socket,sys; s=socket.socket(); sys.exit(0 if s.connect_ex(("127.0.0.1", int(sys.argv[1]))) == 0 else 1)' "$PORT"; then
  echo "[smoke] ERRO: a porta ${PORT} já está em uso. Encerre o processo antes de rodar o smoke." >&2
  exit 2
fi

mkdir -p "${ROOT_DIR}/target"
cleanup() {
  local code=$?
  if [[ -n "${APP_PID}" ]] && kill -0 "${APP_PID}" 2>/dev/null; then
    echo "[smoke] Encerrando backend (PID ${APP_PID} / grupo)..."
    kill -TERM -- "-${APP_PID}" 2>/dev/null || kill -TERM "${APP_PID}" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "${APP_PID}" 2>/dev/null || break
      sleep 0.5
    done
    kill -KILL -- "-${APP_PID}" 2>/dev/null || kill -KILL "${APP_PID}" 2>/dev/null || true
    wait "${APP_PID}" 2>/dev/null || true
  fi
  if [[ $code -ne 0 ]]; then
    echo "[smoke] FALHOU (exit ${code}). Últimas linhas do log:" >&2
    tail -n 60 "$LOG_FILE" 2>/dev/null || true
  fi
  exit $code
}
trap cleanup EXIT INT TERM

echo "[smoke] Iniciando backend com mvn spring-boot:run (log: ${LOG_FILE})"
setsid mvn -q -DskipTests spring-boot:run > "$LOG_FILE" 2>&1 &
APP_PID=$!

echo "[smoke] Aguardando porta ${PORT}..."
if ! python3 - "$PORT" "$APP_PID" <<'PY'
import os
import socket
import sys
import time

port = int(sys.argv[1])
pid = int(sys.argv[2])
deadline = time.time() + 180
while time.time() < deadline:
    try:
        os.kill(pid, 0)
    except OSError:
        print("[smoke] ERRO: processo Maven morreu antes de abrir a porta", file=sys.stderr)
        sys.exit(1)
    with socket.socket() as sock:
        sock.settimeout(1)
        if sock.connect_ex(("127.0.0.1", port)) == 0:
            print(f"[smoke] Porta {port} aberta")
            sys.exit(0)
    time.sleep(1)
print("[smoke] ERRO: timeout aguardando a aplicação subir", file=sys.stderr)
sys.exit(1)
PY
then
  exit 1
fi

# Pequena espera para o CommandLineRunner (seed) concluir antes do primeiro login.
sleep 2

echo "[smoke] Executando validações HTTP com python3"
python3 - "$BASE_URL" <<'PY'
import json
import sys
import time
import urllib.error
import urllib.request

base = sys.argv[1]
failures = []


def call(method, path, body=None, token=None, timeout=30):
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            status = response.status
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8")
        status = error.code
    except Exception as error:  # conexão recusada, timeout etc.
        return None, str(error)
    try:
        parsed = json.loads(raw) if raw else None
    except json.JSONDecodeError:
        parsed = raw
    return status, parsed


def check(label, condition, detail=""):
    if condition:
        print(f"[smoke] OK   {label}")
    else:
        print(f"[smoke] FAIL {label} {detail}")
        failures.append(label)


def snippet(value, limit=500):
    text = json.dumps(value, ensure_ascii=False)
    return text if len(text) <= limit else text[:limit] + "..."


# 1) Login do treinador (com retry para aguardar o seed)
status = None
login = None
for attempt in range(90):
    status, login = call("POST", "/api/auth/login",
                         {"email": "coach@trainlab.app", "password": "coach1234"})
    if status == 200:
        break
    time.sleep(1)
check("POST /api/auth/login -> 200", status == 200, f"status={status} body={login}")
print(f"[smoke]     login: status={status} trecho={snippet(login, 220)}")
if status != 200:
    print("[smoke] Abortando: não foi possível autenticar")
    sys.exit(1)

token = login["token"]
check("login retorna token JWT", isinstance(token, str) and token.count(".") == 2)
check("login retorna role COACH", login["user"].get("role") == "COACH")

# 2) /api/auth/me
status, me = call("GET", "/api/auth/me", token=token)
check("GET /api/auth/me -> 200", status == 200, f"status={status} body={me}")
check("/me retorna o coach", me and me.get("email") == "coach@trainlab.app")
print(f"[smoke]     me: status={status} trecho={snippet(me, 300)}")

# 3) Atletas
status, athletes = call("GET", "/api/athletes", token=token)
check("GET /api/athletes -> 200", status == 200, f"status={status} body={athletes}")
check("lista tem ao menos 4 atletas", isinstance(athletes, list) and len(athletes) >= 4,
      f"total={len(athletes) if isinstance(athletes, list) else '?'}")
marina = next((a for a in athletes if a.get("email") == "marina@trainlab.app"), None) if isinstance(athletes, list) else None
check("Marina presente com 3 esportes", marina is not None and set(marina.get("sports", [])) == {"RUN", "BIKE", "SWIM"},
      snippet(marina, 300) if marina else "marina ausente")
print(f"[smoke]     atletas: total={len(athletes)} marina={snippet(marina, 320)}")

# 4) Treinos
status, workouts = call("GET", "/api/workouts", token=token)
check("GET /api/workouts -> 200", status == 200, f"status={status} body={workouts}")
check("lista tem ao menos 5 treinos (seed)", isinstance(workouts, list) and len(workouts) >= 5,
      f"total={len(workouts) if isinstance(workouts, list) else '?'}")
print(f"[smoke]     treinos: total={len(workouts)} nomes={[w.get('name') for w in workouts][:5]}")
if not isinstance(workouts, list) or not workouts:
    print("[smoke] Abortando: biblioteca vazia")
    sys.exit(1)

# 5) Preview de um treino para Marina
run_workout = next((w for w in workouts if w.get("sport") == "RUN"), workouts[0])
status, preview = call("GET", f"/api/workouts/{run_workout['id']}/preview?athleteId={marina['id']}", token=token)
check("GET preview de treino para Marina -> 200", status == 200, f"status={status} body={preview}")
if status == 200:
    totals = preview.get("totals", {})
    check("preview recalcula duração total", isinstance(totals.get("durationSec"), int) and totals["durationSec"] > 0,
          snippet(totals, 200))
    displays = []
    for block in preview.get("blocks", []):
        for step in block.get("steps", []):
            target = step.get("target") or {}
            displays.append((target.get("display"), target.get("unit")))
    resolved = [d for d in displays if d[0] and d[0] != "Zona não configurada" and d[0] != "Livre"
                and "RPE" not in d[0]]
    check("preview resolve alvos em bpm/pace", len(resolved) > 0, str(displays[:3]))
    check("preview tem distribuição de zonas", bool(totals.get("zoneDistribution")),
          snippet(totals.get("zoneDistribution"), 200))
    print(f"[smoke]     preview: status={status} workout={run_workout['name']} "
          f"durationSec={totals.get('durationSec')} distanceM={totals.get('distanceM')} "
          f"zones={snippet(totals.get('zoneDistribution'), 180)}")
    print(f"[smoke]     alvos resolvidos: {snippet(resolved[:4], 400)}")

# 6) PUT de um treino criando 2 blocos (cria um treino temporário e limpa depois)
temp_body = {
    "name": "Smoke Test Temporário",
    "sport": "RUN",
    "type": "INTERVAL",
    "description": "Treino criado pelo smoke test",
    "tags": ["smoke"],
    "difficulty": 2,
}
status, created = call("POST", "/api/workouts", temp_body, token=token)
check("POST /api/workouts (temporário) -> 201", status == 201, f"status={status} body={created}")
if status != 201:
    print("[smoke] Abortando: não foi possível criar treino temporário")
    sys.exit(1)
temp_id = created["id"]

put_body = {
    "name": "Smoke Test Temporário",
    "sport": "RUN",
    "type": "INTERVAL",
    "description": "PUT replace com 2 blocos",
    "tags": ["smoke", "put"],
    "difficulty": 3,
    "blocks": [
        {
            "repeatCount": 2,
            "title": "Bloco 1 - limiar",
            "notes": "dois steps",
            "steps": [
                {"role": "ACTIVE", "durationType": "TIME", "durationSec": 300,
                 "notes": "limiar", "target": {"type": "HR_ZONE", "zone": 2}},
                {"role": "RECOVERY", "durationType": "TIME", "durationSec": 120,
                 "notes": "recuperação", "target": {"type": "HR_ZONE", "zone": 1}},
            ],
        },
        {
            "repeatCount": 1,
            "title": "Bloco 2 - ritmo",
            "notes": "step por distância",
            "steps": [
                {"role": "ACTIVE", "durationType": "DISTANCE", "distanceM": 1000,
                 "notes": "mil metros", "target": {"type": "PACE_ZONE", "zone": 3}},
            ],
        },
    ],
}
status, updated = call("PUT", f"/api/workouts/{temp_id}", put_body, token=token)
check("PUT /api/workouts/{id} com 2 blocos -> 200", status == 200, f"status={status} body={updated}")
if status == 200:
    check("PUT substitui e retorna 2 blocos", len(updated.get("blocks", [])) == 2,
          f"blocks={len(updated.get('blocks', []))}")
    check("PUT recalcula estimatedDurationSec=840", updated.get("estimatedDurationSec") == 840,
          f"estimado={updated.get('estimatedDurationSec')}")
    check("PUT retorna 3 steps no total", updated.get("stepCount") == 3,
          f"stepCount={updated.get('stepCount')}")
    print(f"[smoke]     PUT: status={status} estimatedDurationSec={updated.get('estimatedDurationSec')} "
          f"blocks={len(updated.get('blocks', []))} stepCount={updated.get('stepCount')}")

    status, temp_preview = call("GET", f"/api/workouts/{temp_id}/preview?athleteId={marina['id']}", token=token)
    check("preview do treino temporário -> 200", status == 200, f"status={status} body={temp_preview}")
    if status == 200:
        dist = temp_preview["totals"].get("zoneDistribution", {})
        check("distribuição HR do temporário = 600s zona2 / 240s zona1",
              dist.get("HR") == {"1": 240, "2": 600}, snippet(dist, 200))
        print(f"[smoke]     preview temporário: durationSec={temp_preview['totals'].get('durationSec')} "
              f"zoneDistribution={snippet(dist, 200)}")

# 7) 401 sem token
status, body = call("GET", "/api/planned")
check("GET /api/planned sem token -> 401", status == 401, f"status={status} body={snippet(body, 200)}")
print(f"[smoke]     401 sem token: status={status} body={snippet(body, 240)}")

# 8) Limpeza do treino temporário
status, _ = call("DELETE", f"/api/workouts/{temp_id}", token=token)
check("DELETE treino temporário -> 204", status == 204, f"status={status}")

if failures:
    print("\n[smoke] FALHAS: " + ", ".join(failures))
    sys.exit(1)

print("\n[smoke] TODAS AS VALIDAÇÕES PASSARAM")
PY

echo "[smoke] Sucesso."
