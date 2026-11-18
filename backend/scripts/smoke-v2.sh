#!/usr/bin/env bash
# Smoke test real da v2 do backend TrainLab (overview, métricas e dashboard).
# Usa python3 (curl não está disponível). Se já houver um backend escutando na porta,
# reaproveita o processo; caso contrário sobe um com Maven e encerra ao final.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export JAVA_HOME="${JAVA_HOME:-/home/rafael/.jdks/temurin21/jdk-21.0.13.1+2}"
export PATH="$JAVA_HOME/bin:$PATH"
PORT="${TRAINLAB_PORT:-8080}"
BASE_URL="http://127.0.0.1:${PORT}"
LOG_FILE="${ROOT_DIR}/target/smoke-v2-backend.log"
APP_PID=""
STARTED_BACKEND=0

if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "[smoke-v2] ERRO: JAVA_HOME inválido: $JAVA_HOME" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "[smoke-v2] ERRO: python3 não encontrado no PATH" >&2
  exit 1
fi

mkdir -p "${ROOT_DIR}/target"
cleanup() {
  local code=$?
  if [[ "${STARTED_BACKEND}" -eq 1 && -n "${APP_PID}" ]] && kill -0 "${APP_PID}" 2>/dev/null; then
    echo "[smoke-v2] Encerrando backend (PID ${APP_PID} / grupo)..."
    kill -TERM -- "-${APP_PID}" 2>/dev/null || kill -TERM "${APP_PID}" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "${APP_PID}" 2>/dev/null || break
      sleep 0.5
    done
    kill -KILL -- "-${APP_PID}" 2>/dev/null || kill -KILL "${APP_PID}" 2>/dev/null || true
    wait "${APP_PID}" 2>/dev/null || true
  fi
  if [[ $code -ne 0 ]]; then
    echo "[smoke-v2] FALHOU (exit ${code}). Últimas linhas do log:" >&2
    tail -n 80 "$LOG_FILE" 2>/dev/null || true
  fi
  exit $code
}
trap cleanup EXIT INT TERM

if python3 -c 'import socket,sys; s=socket.socket(); sys.exit(0 if s.connect_ex(("127.0.0.1", int(sys.argv[1]))) == 0 else 1)' "$PORT"; then
  echo "[smoke-v2] Backend já está rodando em ${BASE_URL}; reutilizando o processo."
else
  if ! command -v mvn >/dev/null 2>&1; then
    echo "[smoke-v2] ERRO: mvn não encontrado no PATH" >&2
    exit 1
  fi
  echo "[smoke-v2] Iniciando backend com mvn spring-boot:run (log: ${LOG_FILE})"
  setsid mvn -q -DskipTests spring-boot:run > "$LOG_FILE" 2>&1 &
  APP_PID=$!
  STARTED_BACKEND=1

  echo "[smoke-v2] Aguardando porta ${PORT}..."
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
        print("[smoke-v2] ERRO: processo Maven morreu antes de abrir a porta", file=sys.stderr)
        sys.exit(1)
    with socket.socket() as sock:
        sock.settimeout(1)
        if sock.connect_ex(("127.0.0.1", port)) == 0:
            print(f"[smoke-v2] Porta {port} aberta")
            sys.exit(0)
    time.sleep(1)
print("[smoke-v2] ERRO: timeout aguardando a aplicação subir", file=sys.stderr)
sys.exit(1)
PY
  then
    exit 1
  fi
fi

# Pequena espera para o CommandLineRunner (seed) concluir antes do primeiro login.
sleep 2

echo "[smoke-v2] Executando validações HTTP com python3"
python3 - "$BASE_URL" <<'PY'
import datetime
import json
import sys
import time
import urllib.error
import urllib.request
import uuid

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
        print(f"[smoke-v2] OK   {label}")
    else:
        print(f"[smoke-v2] FAIL {label} {detail}")
        failures.append(label)


def snippet(value, limit=500):
    text = json.dumps(value, ensure_ascii=False, default=str)
    return text if len(text) <= limit else text[:limit] + "..."


def round_minutes(seconds):
    return int(round(seconds / 60.0))


# 1) Login do treinador (com retry para aguardar o seed)
status = None
login = None
for _ in range(90):
    status, login = call("POST", "/api/auth/login",
                         {"email": "coach@trainlab.app", "password": "coach1234"})
    if status == 200:
        break
    time.sleep(1)
check("POST /api/auth/login (coach) -> 200", status == 200, f"status={status} body={login}")
print(f"[smoke-v2]     login coach: status={status} trecho={snippet(login, 200)}")
if status != 200:
    print("[smoke-v2] Abortando: não foi possível autenticar")
    sys.exit(1)
token = login["token"]

# 2) Atletas e novos campos da v2
status, athletes = call("GET", "/api/athletes", token=token)
check("GET /api/athletes -> 200", status == 200, f"status={status} body={athletes}")
marina = next((a for a in athletes if a.get("email") == "marina@trainlab.app"), None) \
    if isinstance(athletes, list) else None
carlos = next((a for a in athletes if a.get("email") == "carlos@trainlab.app"), None) \
    if isinstance(athletes, list) else None
check("Marina e Carlos presentes", marina is not None and carlos is not None,
      snippet(athletes, 400))
check("AthleteSummary traz goal/eventDate/weeklyHoursAvailable",
      marina is not None and marina.get("goal") == "Ironman 70.3 Florianópolis"
      and marina.get("eventDate") == "2026-12-06" and marina.get("weeklyHoursAvailable") == 12.0,
      snippet(marina, 400) if marina else "marina ausente")
print(f"[smoke-v2]     atletas: total={len(athletes)} marina_goal={marina.get('goal')} "
      f"eventDate={marina.get('eventDate')} horas={marina.get('weeklyHoursAvailable')}")

# 3) Overview da Marina
status, overview = call("GET", f"/api/athletes/{marina['id']}/overview", token=token)
check("GET /api/athletes/{id}/overview -> 200", status == 200, f"status={status} body={overview}")
if status == 200:
    check("overview.athlete contém objetivo/prova/disponibilidade",
          overview["athlete"].get("goal") == "Ironman 70.3 Florianópolis"
          and overview["athlete"].get("eventDate") == "2026-12-06"
          and overview["athlete"].get("weeklyHoursAvailable") == 12.0,
          snippet(overview.get("athlete"), 300))
    check("overview.thresholds não vazio", len(overview.get("thresholds", [])) >= 1,
          f"thresholds={len(overview.get('thresholds', []))}")
    check("overview.zones não vazio", len(overview.get("zones", [])) >= 1,
          f"zones={len(overview.get('zones', []))}")
    load = overview.get("weeklyLoad") or {}
    check("overview.weeklyLoad tem minutos e sessões",
          isinstance(load.get("plannedMinutes"), int) and isinstance(load.get("plannedSessions"), int),
          snippet(load, 200))
    upcoming = overview.get("upcoming") or []
    check("overview.upcoming não vazio", len(upcoming) >= 1, f"upcoming={len(upcoming)}")
    first_upcoming = upcoming[0] if upcoming else {}
    first_workout = first_upcoming.get("workout") or {}
    check("overview.upcoming com workout resumido",
          {"id", "name", "sport", "type", "estimatedDurationSec"} <= set(first_workout.keys()),
          snippet(first_upcoming, 300))
    check("overview.latestMetric presente", isinstance(overview.get("latestMetric"), dict),
          snippet(overview.get("latestMetric"), 200))
    check("overview.last7Metrics com registros", len(overview.get("last7Metrics") or []) >= 5,
          f"last7={len(overview.get('last7Metrics') or [])}")
    print(f"[smoke-v2]     overview: status={status} weeklyLoad={snippet(load, 120)} "
          f"upcoming={len(upcoming)} latestMetric={snippet(overview.get('latestMetric'), 180)}")

# 4) Planejamento bruto para conferir a carga de 7 dias
status, all_planned = call("GET", "/api/planned", token=token)
check("GET /api/planned -> 200", status == 200, f"status={status} body={snippet(all_planned, 200)}")
today = datetime.date.today()
window_end = today + datetime.timedelta(days=6)

planned = all_planned if isinstance(all_planned, list) else []
window = [p for p in planned
          if today.isoformat() <= p["scheduledDate"] <= window_end.isoformat()]
expected_total_seconds = sum((p.get("workout") or {}).get("estimatedDurationSec") or 0 for p in window)
expected_marina_sessions = [p for p in window if p["athleteId"] == marina["id"]]
expected_marina_seconds = sum((p.get("workout") or {}).get("estimatedDurationSec") or 0
                              for p in expected_marina_sessions)
if status == 200 and isinstance(overview, dict):
    load = overview.get("weeklyLoad") or {}
    check("overview.weeklyLoad.plannedSessions confere com /api/planned",
          load.get("plannedSessions") == len(expected_marina_sessions),
          f"{load.get('plannedSessions')} != {len(expected_marina_sessions)}")
    check("overview.weeklyLoad.plannedMinutes = soma(estimatedDurationSec)/60",
          load.get("plannedMinutes") == round_minutes(expected_marina_seconds),
          f"{load.get('plannedMinutes')} != {round_minutes(expected_marina_seconds)}")

# 5) Ciclo de vida de métrica (POST upsert, GET, DELETE) em datas fora do seed
metric_date = (today - datetime.timedelta(days=10)).isoformat()
older_date = (today - datetime.timedelta(days=12)).isoformat()
invalid_date = (today - datetime.timedelta(days=11)).isoformat()

payload = {
    "date": metric_date,
    "sleepHours": 7.4,
    "deepSleepHours": 1.3,
    "remSleepHours": 1.7,
    "lightSleepHours": 4.1,
    "awakeHours": 0.3,
    "hrv": 67,
    "restingHr": 47,
    "bodyBatteryLow": 36,
    "bodyBatteryHigh": 81,
    "stressLevel": 27,
    "mood": 4,
    "rpe": 6,
    "weightKg": 58.0,
    "notes": "Métrica criada pelo smoke v2",
}
status, created = call("POST", f"/api/athletes/{marina['id']}/metrics", payload, token=token)
check("POST /api/athletes/{id}/metrics -> 201", status == 201, f"status={status} body={created}")
metric_id = created.get("id") if isinstance(created, dict) else None
check("métrica criada retorna id, atleta, data, humor e RPE",
      isinstance(metric_id, str) and created.get("athleteId") == marina["id"]
      and created.get("date") == metric_date and created.get("mood") == 4 and created.get("rpe") == 6,
      snippet(created, 400))
print(f"[smoke-v2]     POST métrica: status={status} trecho={snippet(created, 420)}")

payload_upsert = dict(payload)
payload_upsert.update({"sleepHours": 8.0, "mood": 5, "rpe": 7})
status, upserted = call("POST", f"/api/athletes/{marina['id']}/metrics", payload_upsert, token=token)
check("POST na mesma data faz upsert -> 201 e mesmo id",
      status == 201 and isinstance(upserted, dict) and upserted.get("id") == metric_id,
      f"status={status} body={snippet(upserted, 300)}")
check("upsert atualiza os valores (sono 8.0, humor 5, RPE 7)",
      isinstance(upserted, dict) and upserted.get("sleepHours") == 8.0
      and upserted.get("mood") == 5 and upserted.get("rpe") == 7,
      snippet(upserted, 300))
print(f"[smoke-v2]     upsert: status={status} id={upserted.get('id') if isinstance(upserted, dict) else None} "
      f"sleep={upserted.get('sleepHours') if isinstance(upserted, dict) else None} "
      f"mood={upserted.get('mood') if isinstance(upserted, dict) else None}")

older_payload = dict(payload)
older_payload.update({"date": older_date, "sleepHours": 6.9, "mood": 3, "rpe": 5})
status, older = call("POST", f"/api/athletes/{marina['id']}/metrics", older_payload, token=token)
check("POST métrica em data anterior -> 201", status == 201, f"status={status} body={older}")
older_id = older.get("id") if isinstance(older, dict) else None

from_date = (today - datetime.timedelta(days=13)).isoformat()
to_date = (today - datetime.timedelta(days=9)).isoformat()
status, metrics = call("GET", f"/api/athletes/{marina['id']}/metrics?from={from_date}&to={to_date}",
                       token=token)
check("GET /api/athletes/{id}/metrics?from&to -> 200", status == 200,
      f"status={status} body={snippet(metrics, 300)}")
check("GET métricas retorna as 2 métricas do período", isinstance(metrics, list) and len(metrics) == 2,
      snippet(metrics, 300))
check("GET métricas ordena por data desc",
      isinstance(metrics, list) and len(metrics) == 2
      and metrics[0]["date"] == metric_date and metrics[1]["date"] == older_date,
      snippet([m.get("date") for m in metrics] if isinstance(metrics, list) else metrics, 200))
print(f"[smoke-v2]     GET métricas: status={status} datas="
      f"{[m.get('date') for m in metrics] if isinstance(metrics, list) else metrics}")

status, invalid = call("POST", f"/api/athletes/{marina['id']}/metrics",
                       dict(payload, date=invalid_date, mood=9), token=token)
check("POST métrica com humor fora da faixa -> 400", status == 400,
      f"status={status} body={snippet(invalid, 300)}")
status, invalid_rpe = call("POST", f"/api/athletes/{marina['id']}/metrics",
                           dict(payload, date=invalid_date, rpe=11), token=token)
check("POST métrica com RPE fora da faixa -> 400", status == 400,
      f"status={status} body={snippet(invalid_rpe, 300)}")
status, invalid_date_body = call("POST", f"/api/athletes/{marina['id']}/metrics",
                                 {k: v for k, v in payload.items() if k != "date"}, token=token)
check("POST métrica sem data -> 400", status == 400,
      f"status={status} body={snippet(invalid_date_body, 300)}")

status, _ = call("DELETE", f"/api/athletes/{marina['id']}/metrics/{metric_id}", token=token)
check("DELETE /api/athletes/{id}/metrics/{metricId} -> 204", status == 204, f"status={status}")
if older_id:
    status, _ = call("DELETE", f"/api/athletes/{marina['id']}/metrics/{older_id}", token=token)
    check("DELETE da segunda métrica -> 204", status == 204, f"status={status}")

status, metrics_after = call("GET", f"/api/athletes/{marina['id']}/metrics?from={from_date}&to={to_date}",
                             token=token)
check("após DELETE o período fica vazio",
      status == 200 and isinstance(metrics_after, list) and len(metrics_after) == 0,
      snippet(metrics_after, 250))
print(f"[smoke-v2]     DELETE métricas: status={status} restantes={metrics_after}")

# 6) Dashboard do treinador
status, dashboard = call("GET", "/api/dashboard", token=token)
check("GET /api/dashboard (coach) -> 200", status == 200, f"status={status} body={snippet(dashboard, 300)}")
if status == 200:
    check("dashboard tem os 4 KPIs",
          all(isinstance(dashboard.get(k), int) for k in
              ("athleteCount", "workoutCount", "plannedSessions7d", "plannedMinutes7d")),
          snippet({k: dashboard.get(k) for k in
                   ("athleteCount", "workoutCount", "plannedSessions7d", "plannedMinutes7d")}, 200))
    check("dashboard.athleteCount confere com /api/athletes",
          dashboard.get("athleteCount") == len(athletes),
          f"{dashboard.get('athleteCount')} != {len(athletes)}")
    check("dashboard.plannedSessions7d confere com /api/planned",
          dashboard.get("plannedSessions7d") == len(window),
          f"{dashboard.get('plannedSessions7d')} != {len(window)}")
    check("dashboard.plannedMinutes7d = soma(estimatedDurationSec)/60",
          dashboard.get("plannedMinutes7d") == round_minutes(expected_total_seconds),
          f"{dashboard.get('plannedMinutes7d')} != {round_minutes(expected_total_seconds)}")
    roster = dashboard.get("roster") or []
    check("dashboard.roster traz o plantel", len(roster) >= 4, f"roster={len(roster)}")
    marina_entry = next((r for r in roster if r.get("athleteId") == marina["id"]), None)
    check("roster da Marina tem esportes e carga 7d",
          marina_entry is not None and set(marina_entry.get("sports") or []) == {"RUN", "BIKE", "SWIM"}
          and marina_entry.get("plannedMinutes7d") == round_minutes(expected_marina_seconds),
          snippet(marina_entry, 400))
    check("roster da Marina tem próxima sessão e métrica mais recente",
          marina_entry is not None and marina_entry.get("nextSessionDate") is not None
          and marina_entry.get("nextWorkoutName") is not None
          and isinstance(marina_entry.get("latestMetric"), dict),
          snippet(marina_entry, 400))
    check("roster ordenado por nome",
          [r.get("displayName") for r in roster] == sorted(
              [r.get("displayName") for r in roster], key=str.casefold),
          snippet([r.get("displayName") for r in roster], 200))
    print(f"[smoke-v2]     dashboard: status={status} "
          f"KPIs={snippet({k: dashboard.get(k) for k in ('athleteCount', 'workoutCount', 'plannedSessions7d', 'plannedMinutes7d')}, 160)}")
    print(f"[smoke-v2]     roster Marina={snippet(marina_entry, 450)}")
    print(f"[smoke-v2]     roster (nomes)={[r.get('displayName') for r in roster]}")

# 7) Login do atleta e regras de acesso
status, athlete_login = call("POST", "/api/auth/login",
                             {"email": "marina@trainlab.app", "password": "atleta1234"})
check("POST /api/auth/login (atleta Marina) -> 200", status == 200,
      f"status={status} body={snippet(athlete_login, 250)}")
athlete_token = athlete_login["token"] if status == 200 else None
check("login da atleta retorna role ATHLETE e athleteId",
      status == 200 and athlete_login["user"].get("role") == "ATHLETE"
      and athlete_login["user"].get("athleteId") == marina["id"],
      snippet(athlete_login.get("user") if isinstance(athlete_login, dict) else athlete_login, 250))
print(f"[smoke-v2]     login atleta: status={status} "
      f"user={snippet(athlete_login.get('user') if isinstance(athlete_login, dict) else athlete_login, 250)}")

status, denied_dashboard = call("GET", "/api/dashboard", token=athlete_token)
check("GET /api/dashboard como ATHLETE -> 403", status == 403,
      f"status={status} body={snippet(denied_dashboard, 250)}")
print(f"[smoke-v2]     403 dashboard atleta: status={status} body={snippet(denied_dashboard, 250)}")

status, own_overview = call("GET", f"/api/athletes/{marina['id']}/overview", token=athlete_token)
check("GET overview do próprio atleta -> 200", status == 200,
      f"status={status} body={snippet(own_overview, 200)}")

status, other_overview = call("GET", f"/api/athletes/{carlos['id']}/overview", token=athlete_token)
check("GET overview de outro atleta -> 403", status == 403,
      f"status={status} body={snippet(other_overview, 250)}")
print(f"[smoke-v2]     403 overview de outro atleta: status={status} "
      f"body={snippet(other_overview, 250)}")

status, own_metrics = call("GET", f"/api/athletes/{marina['id']}/metrics", token=athlete_token)
check("GET métricas do próprio atleta -> 200", status == 200,
      f"status={status} body={snippet(own_metrics, 200)}")

status, denied_post = call("POST", f"/api/athletes/{marina['id']}/metrics",
                           dict(payload, date=(today - datetime.timedelta(days=20)).isoformat()),
                           token=athlete_token)
check("POST métrica como ATHLETE -> 403 (COACH-only)", status == 403,
      f"status={status} body={snippet(denied_post, 250)}")
print(f"[smoke-v2]     403 métrica por atleta: status={status} body={snippet(denied_post, 250)}")

status, denied_delete = call("DELETE",
                             f"/api/athletes/{marina['id']}/metrics/{uuid.uuid4()}",
                             token=athlete_token)
check("DELETE métrica como ATHLETE -> 403 (COACH-only)", status == 403,
      f"status={status} body={snippet(denied_delete, 250)}")

# 8) 401 sem token segue valendo
status, unauthorized = call("GET", "/api/dashboard")
check("GET /api/dashboard sem token -> 401", status == 401,
      f"status={status} body={snippet(unauthorized, 200)}")

if failures:
    print("\n[smoke-v2] FALHAS: " + ", ".join(failures))
    sys.exit(1)

print("\n[smoke-v2] TODAS AS VALIDAÇÕES DA V2 PASSARAM")
PY

echo "[smoke-v2] Sucesso."
