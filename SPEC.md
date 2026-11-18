# TrainLab — Especificação Técnica v1

Plataforma de treinamento personalizado multiesporte (corrida, ciclismo e natação),
inspirada no TrainingPeaks. Dois perfis: **Treinador** e **Atleta**.

Stack: **Backend Java 21 + Spring Boot 4.0.9 (REST/JSON, JPA, H2 dev / PostgreSQL prod)**
+ **Frontend React 19 + TypeScript + Vite + Tailwind CSS v4 + dnd-kit**.

Portas: backend `8080`, frontend `5173` (proxy `/api` → `8080`).

---

## 1. Modelo de domínio

### 1.1 Usuário e atleta
- `AppUser`: `id` (UUID), `name`, `email` (único), `passwordHash` (BCrypt), `role`
  (`COACH` | `ATHLETE`), `createdAt`.
- `Athlete`: perfil esportivo vinculado a um `AppUser` (1:1). Campos: `id`, `userId`,
  `coachId` (usuário treinador dono), `displayName`, `birthDate`, `sex`
  (`M`|`F`|`OTHER`), `heightCm`, `weightKg`, `notes`, `createdAt`.
- O treinador cria o atleta já com email + senha inicial; o atleta faz login normalmente.

### 1.2 Limiares por modalidade
`SportThreshold` (1 por atleta+modalidade): `id`, `athleteId`, `sport`
(`RUN`|`BIKE`|`SWIM`), `maxHr`, `restingHr`, `lthr` (FC de limiar), `ftpWatts`
(ciclismo), `thresholdPaceSecPerKm` (corrida), `cssSecPer100m` (natação, ritmo
crítico por 100 m), `updatedAt`.

### 1.3 Zonas de treino
`ZoneSet` persistida por atleta+sport+zoneType (`HR`, `PACE`, `POWER`), contendo
linhas `AthleteZone` (`zoneNumber`, `name`, `minValue`, `maxValue`, `unit`).
São **geradas automaticamente** a partir dos limiares ao salvar limiares, mas o
treinador pode editá-las (PUT). Regras de geração (documentadas e calculadas no
backend):

**FC — 5 zonas, % de LTHR (Friel)**
| Zona | Nome | % LTHR |
|---|---|---|
| 1 | Recuperação | 50–68% |
| 2 | Endurance | 69–83% |
| 3 | Tempo | 84–94% |
| 4 | Limiar | 95–105% |
| 5 | VO2máx | 106–120% |

`minValue/maxValue` em bpm, com `unit = "bpm"`. Se `lthr` ausente, usar 85% de `maxHr` como LTHR.

**Potência (bike) — 7 zonas, % de FTP (Coggan)**
| Zona | Nome | % FTP |
|---|---|---|
| 1 | Ativação | 0–55% |
| 2 | Endurance | 56–75% |
| 3 | Tempo | 76–90% |
| 4 | Limiar | 91–105% |
| 5 | VO2máx | 106–120% |
| 6 | Anaeróbico | 121–150% |
| 7 | Neuromuscular | 151–200% |

`unit = "w"`. Se `ftpWatts` ausente, gerar apenas zonas de FC nesse esporte.

**Pace (corrida) — 5 zonas por % da velocidade de limiar**
Velocidade = 1/pace. Zona definida por faixa de % da velocidade de limiar;
`minValue` = pace mais rápido (s/km) e `maxValue` = pace mais lento (s/km), `unit = "s_per_km"`.

| Zona | Nome | % velocidade | pace resultante (s/km) |
|---|---|---|---|
| 1 | Recuperação | 60–75% | pace = thresholdPace × 100/pct |
| 2 | Endurance | 78–88% | |
| 3 | Tempo | 89–95% | |
| 4 | Limiar | 96–103% | |
| 5 | Intervalado | 104–118% | |

**Pace (natação) — 5 zonas por % da velocidade CSS**
`minValue/maxValue` em s/100 m, `unit = "s_per_100m"`.
| Zona | Nome | % CSS |
|---|---|---|
| 1 | Recuperação | 80–90% |
| 2 | Aeróbio | 91–97% |
| 3 | Limiar | 98–104% |
| 4 | VO2 | 105–112% |
| 5 | Velocidade | 113–130% |

### 1.4 Treino estruturado (template)
- `Workout`: `id`, `coachId`, `name`, `sport`, `type`
  (`ENDURANCE`|`TEMPO`|`INTERVAL`|`RECOVERY`|`RACE`|`SKILL`|`OTHER`),
  `description`, `tags` (lista), `difficulty` (1–5), `estimatedDurationSec`
  (calculado no save), `archived`, `createdAt`, `updatedAt`.
- `WorkoutBlock`: `id`, `workoutId`, `position`, `repeatCount` (≥1), `title`, `notes`.
- `WorkoutStep`: `id`, `blockId`, `position`, `role`
  (`WARMUP`|`ACTIVE`|`RECOVERY`|`COOLDOWN`|`REST`|`OTHER`),
  `durationType` (`TIME`|`DISTANCE`|`OPEN`), `durationSec` (se TIME),
  `distanceM` (se DISTANCE), `notes`, e o alvo (`Target` embutido):
  - `type`: `HR_ZONE` | `HR_PERCENT` | `PACE_ZONE` | `PACE_PERCENT` |
    `POWER_ZONE` | `POWER_PERCENT` | `RPE` | `FREE`
  - `zone`: número da zona (para *_ZONE)
  - `minValue`/`maxValue`: percentual (ex.: 95–105) para *_PERCENT; RPE 1–10 para RPE
  - `display`: texto livre opcional de reforço (ex.: "cadência 90 rpm")

O alvo é sempre **relativo** no template → individualização acontece na resolução
por atleta. O treinador pode opcionalmente fixar alvo absoluto preenchendo
`absoluteMin`/`absoluteMax` + `absoluteUnit` (bpm | w | s_per_km | s_per_100m).

### 1.5 Sessão planejada (base para o calendário da fase 2)
`PlannedWorkout`: `id`, `athleteId`, `workoutId`, `scheduledDate` (ISO date),
`status` (`PLANNED`|`COMPLETED`|`SKIPPED`), `notes`. Endpoints read/create nesta versão.

---

## 2. API REST (`/api`)

Autenticação: JWT HS256 no header `Authorization: Bearer <token>`.
Todas as rotas exigem autenticação, exceto `/api/auth/**`.

### 2.1 Auth
```
POST /api/auth/register  {name, email, password, role}
  → 201 {token, user:{id,name,email,role}}
POST /api/auth/login     {email, password}
  → 200 {token, user:{id,name,email,role, athleteId?}}
GET  /api/auth/me        → {id,name,email,role, athleteId?}
```

### 2.2 Atletas (treinador)
```
GET    /api/athletes                    → [AthleteSummary]
POST   /api/athletes                    {displayName,email,password,birthDate,sex,heightCm,weightKg,notes}
GET    /api/athletes/{id}               → AthleteDetail
PUT    /api/athletes/{id}               {displayName,birthDate,sex,heightCm,weightKg,notes}
DELETE /api/athletes/{id}
GET    /api/athletes/{id}/thresholds    → [Threshold]
PUT    /api/athletes/{id}/thresholds/{sport}  body Threshold → regenera zonas, retorna Threshold
GET    /api/athletes/{id}/zones         → [Zone]
PUT    /api/athletes/{id}/zones/{sport}/{type}  body [ZoneInput] → [Zone]
```
`AthleteSummary`: `{id, displayName, email, sex, birthDate, sports:["RUN","BIKE"], thresholdSummary?}`
`AthleteDetail`: summary + `thresholds: [Threshold]` + `coachId`.
`Threshold`: `{sport,maxHr,restingHr,lthr,ftpWatts,thresholdPaceSecPerKm,cssSecPer100m}`
`Zone`: `{id, sport, type, zoneNumber, name, minValue, maxValue, unit}`

### 2.3 Treinos
```
GET    /api/workouts?sport=&q=&tag=     → [WorkoutSummary]
POST   /api/workouts                    {name,sport,type,description,tags,difficulty}
GET    /api/workouts/{id}               → Workout (com blocks/steps)
PUT    /api/workouts/{id}               {name,sport,type,description,tags,difficulty,blocks:[...]}
DELETE /api/workouts/{id}
POST   /api/workouts/{id}/duplicate     → Workout copiado (nome + " (cópia)")
GET    /api/workouts/{id}/preview?athleteId=  → WorkoutPreview (alvos resolvidos)
GET    /api/workouts/tags               → [string] (distintas)
```
`WorkoutSummary`: `{id,name,sport,type,difficulty,tags,estimatedDurationSec,stepCount,updatedAt}`
`Workout`: summary fields + `description` + `blocks:[{id,position,repeatCount,title,notes,steps:[Step]}]`
`Step`: `{id,position,role,durationType,durationSec,distanceM,notes,target}`
`Target`: `{type,zone,minValue,maxValue,display,absoluteMin,absoluteMax,absoluteUnit}`

**PUT é replace completo**: apaga blocos/steps existentes e regrava os enviados
(posições por índice do array). Ignora `id` enviados nos children (gera novos).
Recalcula `estimatedDurationSec` = Σ (block.repeat × Σ step.durationSec).
Steps `DISTANCE`/`OPEN` não entram na soma de tempo.

`WorkoutPreview`:
```
{
  workoutId, athleteId, sport, athleteName,
  totals: {durationSec, distanceM, zoneDistribution: {"HR": {"1":120,"2":900}, "PACE": {...}, "POWER": {...}}},
  blocks: [{
    repeatCount, title,
    steps: [{role, durationType, durationSec, distanceM,
             target: {type, zone, unit, min, max, display, zoneName}}]
  }]
}
```
Resolução dos alvos para o atleta:
- `*_ZONE` → linhas da `ZoneSet` do atleta (HR/PACE/POWER conforme esporte);
  `display` = "Z2 · 152–163 bpm" / "Z3 · 4:35–4:52 /km" / "Z4 · 210–235 W" / "Z2 · 1:45–1:55 /100m".
- `*_PERCENT` → aplica % sobre limiar do atleta (LTHR, pace limiar, FTP; CSS p/ natação).
- `RPE` → "RPE 7–8 (difícil)" sem unidade.
- `FREE` → "Livre".
- Se zona não existir para o atleta → retornar `display: "Zona não configurada"`, sem erro.
Distribuição de zonas calcula segundos por zona somando `durationSec × repeat` de cada step.
Para pace, converter `s/km` para `m:ss` no display; swim `s/100m` idem.

### 2.4 Planejamento
```
GET /api/planned?athleteId=&from=&to=   → [PlannedWorkout]
POST /api/planned {athleteId, workoutId, scheduledDate}
DELETE /api/planned/{id}
```

### 2.5 Erros
JSON `{timestamp,status,error,message,path}` — 400 validação, 401 sem token,
403 sem permissão, 404 não encontrado, 409 conflito (email duplicado).

---

## 3. Segurança e regras
- JWT secret via `app.jwt.secret` (default dev) e expiração 12 h.
- `COACH` acessa atletas/treinos que ele criou. `ATHLETE` acessa apenas seus dados:
  `GET /api/auth/me`, `GET /api/athletes/{seuId}`, `GET /api/planned?athleteId=seuId`,
  e treinos atribuídos a ele (`GET /api/planned` retorna o workout resumido).
- Senha mínima 8 caracteres; email válido.
- Seed de demonstração na inicialização (sempre em dev; idempotente):
  - Treinador: `coach@trainlab.app` / `coach1234`
  - Atleta triatleta: `marina@trainlab.app` / `atleta1234` (3 esportes, limiares completos)
  - Atletas: `carlos@trainlab.app` (corrida), `ana@trainlab.app` (bike), `paula@trainlab.app` (natação)
  - 5 treinos de exemplo (2 corrida, 2 bike, 1 natação) com blocos/steps realistas.

---

## 4. Frontend (React)

### 4.1 Estrutura de rotas
```
/login
/                     → Dashboard (treinador) ou visão do atleta
/athletes             → lista de atletas
/athletes/:id         → detalhe: dados, limiares e zonas
/workouts             → biblioteca (busca, filtro por esporte, tags)
/workouts/new         → construtor novo treino
/workouts/:id         → construtor de treino
/plan                 → calendário simples semanal (lista por dia)
```

### 4.2 Telas
- **Layout**: sidebar escura fixa (logo TrainLab, ícones: Dashboard, Atletas,
  Treinos, Planejamento), header com nome do usuário + logout. Responsivo (sidebar vira drawer < 768px).
- **Login/Cadastro**: card central, validação, mensagens de erro, credenciais demo exibidas.
- **Dashboard**: cards com totais (atletas, treinos, minutos planejados), lista de treinos
  recentes e atletas recentes.
- **Atletas**: tabela/cards com esporte(s) e resumo de limiares; modal "Novo atleta".
- **Detalhe do atleta**: abas Dados / Limiares & Zonas. Limiares editáveis por esporte;
  tabela de zonas (FC, potência, pace) com valores e unidade; botão "recalcular zonas".
- **Biblioteca**: cards com esporte (badge colorida: corrida=laranja, bike=azul, natação=ciano),
  duração estimada, nº de steps, tags, dificuldade; ações duplicar/excluir; filtros.
- **Construtor**: layout 3 colunas — estrutura (blocos após blocos; dentro, os 2 steps +
  repetições), editor do step selecionado (direita), e barra inferior com duração total e
  distribuição de zonas. Drag-and-drop para reordenar steps (dnd-kit) e blocos.
  Seletor de atleta para "pré-visualizar alvos resolvidos" (mostra bpm/pace/watts).

### 4.3 Alvos no editor de step
- Corrida: FC zona 1–5, Pace zona 1–5, % LTHR, % pace, RPE, Livre.
- Bike: FC zona 1–5, Potência zona 1–7, % FTP, RPE, Livre.
- Natação: FC zona 1–5, Pace zona 1–5, % CSS, RPE, Livre.
- Duração: tempo (mm:ss / hh:mm) ou distância (m/km) ou aberta.

### 4.4 Detalhes técnicos front
- `axios` com interceptor de token (localStorage `trainlab.token`), 401 → redireciona /login.
- TanStack Query para dados; estado do builder em `useReducer` local.
- Build: `npm run build` deve passar sem erros TypeScript.
- Proxy Vite `/api` → `http://localhost:8080`.
- PWA: manifest + ícone simples (não bloquear o build).

---

## 5. Estrutura de arquivos
```
backend/
  pom.xml
  src/main/java/com/trainlab/
    TrainLabApplication.java
    config/ (SecurityConfig, JwtService, JwtAuthFilter, WebConfig, DataSeeder)
    auth/ (AuthController, DTOs)
    user/ (AppUser, UserRole, UserRepository)
    athlete/ (Athlete, SportThreshold, ZoneSet, AthleteZone, repositories, service, controller, DTOs)
    workout/ (Workout, WorkoutBlock, WorkoutStep, Target, enums, repo, service, controller, DTOs)
    plan/ (PlannedWorkout, repo, controller)
    common/ (ApiException, GlobalExceptionHandler)
  src/main/resources/application.yml, application-postgres.yml
frontend/
  package.json, vite.config.ts, tsconfig.json, index.html
  src/ (main.tsx, App.tsx, api/, components/, pages/, styles)
docker-compose.yml
README.md
```

## 6. Critérios de aceite da v1
1. `mvn -q -DskipTests package` compila com JDK 21.
2. `mvn spring-boot:run` sobe em 8080 e o seed cria usuários/atletas/treinos.
3. Login do coach via API retorna JWT; `GET /api/workouts` lista os 5 treinos.
4. `GET /api/workouts/{id}/preview?athleteId=` resolve bpm/pace/watts por atleta.
5. `npm run build` passa; app em 5173 com login, biblioteca e construtor funcionando.
6. Criar/editar treino pelo construtor persiste blocos, repetições e alvos.

---

## 7. Roadmap — visão do atleta (referência TrainingPeaks mobile)

Capturas do app TP (out/2026) mostram o que a visão do ATLETA precisa ter.
Registrado a partir de OCR das telas (IMG_2872–2874):

**Início (atleta)**
- Card do próximo treino: duração (`1:00:00`), distância (`12,5 km`), `56 TSS`, botão Atualizar.
- Blocos "Insights de Recuperação" (premium): **VFC/HRV (ms)**, **FC de repouso (bpm)**,
  **Sono**, todos com fonte `Garmin Health`.
- "Análise de Treinos" (premium), **Humor** e **RPE** (ex.: "4/6 treinos · média de 7 dias"),
  **Eventos** (provas futuras).
- Nav inferior: Início · Calendário · Biblioteca · Análises · Mais.

**"Esta semana"**
- Duração total, Distância, **TSS**; **Planejado × Concluídos**.
- **Conformidade**: Totalmente conforme / Parcialmente conforme / Não planejado.
- **Tendências**: **Aptidão (CTL)** 60, **Forma (TSB)** −15, **Fadiga (ATL)** 47.

**Implicações técnicas (fase 2+)**
- Métricas: TSS, IF, RPE, CTL/ATL/TSB (médias móveis 42d/7d), conformidade
  planejado×realizado, VFC, FC repouso, sono, humor.
- Integração **Garmin Health** (parceria) para HRV/RHR/sono; importação FIT/TCX/GPX na fase 1.5.
- Tela "Hoje" do atleta com check-in de RPE/humor e card do treino do dia.
- Cards de treino na biblioteca passam a exibir TSS estimado e distância quando aplicável.

---

## 8. v2 — Identidade visual e ficha 360 do atleta (treinador)

### 8.1 Cores (3 predominantes: azul, amarelo, branco)
Definir tokens no `src/index.css` (Tailwind v4 `@theme`) e usar SOMENTE eles:

| Token | Uso | Escala |
|---|---|---|
| `brand-*` (azul) | ações primárias, links, sidebar, destaque | 50 `#eff6ff`, 100 `#dbeafe`, 200 `#bfdbfe`, 300 `#93c5fd`, 400 `#60a5fa`, 500 `#3b82f6`, 600 `#2563eb`, 700 `#1d4ed8`, 800 `#1e40af`, 900 `#1e3a8a` |
| `accent-*` (amarelo) | realces, badges, aba ativa, dificuldade, TSS | 50 `#fffbeb`, 100 `#fef3c7`, 200 `#fde68a`, 300 `#fcd34d`, 400 `#fbbf24`, 500 `#f59e0b`, 600 `#d97706`, 700 `#b45309` |
| `ink-*` (azul-escuro) | sidebar, títulos, texto forte | 900 `#0b1f3a`, 800 `#12305c`, 700 `#1a4278`, 600 `#2456a0`, 500 `#3b6fc4`, 400 `#6b93d6`, 300 `#9cb6e6`, 200 `#cddcf3`, 100 `#e6eefb`, 50 `#f4f8fe` |
| `canvas` | fundo das páginas | branco `#ffffff` + cinza-azulado `#f5f8fc` |

Regras: fundo branco/`#f5f8fc`; sidebar `ink-900` com texto branco e item ativo em `accent-400`
(fundo `white/10`); botão primário `brand-600`; botão de destaque `accent-400` com texto `ink-900`.
Não usar verde/vermelho/roxo como cor de destaque (vermelho só para erro). Esportes:
corrida `brand-600`, bike `accent-500`, natação `cyan-600`. Zonas: gradiente `brand-200` (Z1) →
`accent-500` (zona máxima), sem vermelho.

### 8.2 Ficha 360 do atleta
`Athlete` ganha os campos: `goal` (texto livre), `eventDate` (data), `weeklyHoursAvailable` (número).
Criar `DailyMetric`: `id`, `athleteId`, `date` (única por atleta+data), `sleepHours`,
`deepSleepHours`, `remSleepHours`, `lightSleepHours`, `awakeHours`, `hrv`, `restingHr`,
`bodyBatteryLow`, `bodyBatteryHigh`, `stressLevel`, `mood` (1–5), `rpe` (1–10), `weightKg`, `notes`.

### 8.3 Novos endpoints
```
GET  /api/athletes/{id}/overview
  → { athlete:{...goal,eventDate,weeklyHoursAvailable},
      thresholds:[...], zones:[...],
      upcoming:[{id,scheduledDate,status,workout:{id,name,sport,type,estimatedDurationSec}}],
      weeklyLoad:{plannedMinutes,plannedSessions},
      latestMetric: DailyMetric|null, last7Metrics:[DailyMetric] }

GET  /api/athletes/{id}/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD → [DailyMetric] (desc por data)
POST /api/athletes/{id}/metrics  body DailyMetricInput → 201 DailyMetric (upsert por data)
DELETE /api/athletes/{id}/metrics/{metricId} → 204

GET  /api/dashboard
  → { athleteCount, workoutCount, plannedSessions7d, plannedMinutes7d,
      roster:[{athleteId,displayName,sports:[],plannedMinutes7d,nextSessionDate,
               nextWorkoutName,latestMetric:DailyMetric|null}] }
```
Permissões: COACH só os próprios atletas; ATHLETE lê apenas seus dados (overview/metrics);
POST/DELETE metrics é COACH-only nesta versão.

### 8.4 Telas
- **Dashboard (treinador)**: 4 KPIs (atletas, treinos, sessões 7d, minutos 7d) + tabela do
  plantel com atleta, esportes, carga 7d (min), próximo treino, sono/VFC/FC repouso do último
  registro + cards dos treinos recentes.
- **Atletas**: cards mais ricos — nome, esportes, objetivo/prova, limiares resumidos,
  carga 7d, próxima sessão, métrica mais recente.
- **Detalhe do atleta** com 4 abas: `Visão geral` (dados, objetivo, disponibilidade, cards de
  carga e próximas sessões, resumo de métricas), `Limiares & Zonas`, `Planejamento`
  (próximos 14 dias + adicionar/remover), `Métricas` (formulário de registro + tabela e
  gráfico de barras dos últimos 14 dias para sono, VFC e FC repouso).
- **Login/Auth** também na nova paleta (sidebar/tema azul, destaque amarelo).

### 8.5 Critérios de aceite v2
1. `mvn package` e `npm run build` passam.
2. Nenhum texto/link quebrado nas telas existentes após o rebrand.
3. `GET /api/dashboard` e `/api/athletes/{id}/overview` retornam dados reais do seed.
4. Métricas: POST cria/atualiza por data, GET lista, DELETE remove.
5. E2E Playwright: login, dashboard com tabela do plantel, abas do atleta, registro de métrica.
