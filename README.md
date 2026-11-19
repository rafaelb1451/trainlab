# TrainLab

Plataforma de treinamento personalizado multiesporte (corrida, ciclismo e natação),
inspirada no TrainingPeaks, com perfis de **Treinador** e **Atleta**.

> Status: v6 — modo treinador completo (ficha 360 do atleta, construtor de treino
> estruturado com individualização por zonas, calendário estilo TrainingPeaks,
> análises com CTL/ATL/TSB e importação de atividades TCX/GPX/FIT com tela de
> "Analisar treino" (Análise 360).

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Java 21 + Spring Boot 4.0.9 (REST, JPA, Security/JWT) |
| Banco | H2 arquivo (dev) · PostgreSQL 17 (via Docker) |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 + dnd-kit |
| Atividades | Importação TCX/GPX/FIT, vínculo ao planejado, análise completa |
| Futuro | Sync automático Garmin/Strava (API), notificações |

## Como rodar

Pré-requisitos: **JDK 21**, **Node 22+** e **Maven 3.9+** — com `java`, `node` e `mvn` no PATH,
ou `JAVA_HOME` apontando para o JDK 21.

**Linux / macOS**

```bash
./scripts/dev.sh
```

**Windows (PowerShell)**

```powershell
.\scripts\dev.ps1
```

Os dois sobem o backend em `:8080` e o frontend em `:5173`, e encerram ambos com `Ctrl+C`.

Rodando separado:

```bash
cd backend  && mvn spring-boot:run -Dspring-boot.run.profiles=dev
cd frontend && npm install && npm run dev
```

> O perfil `dev` é o que popula os dados demo. Sem ele, a aplicação sobe com o banco vazio e
> **sem** contas de demonstração — é o comportamento seguro para produção.

- Frontend: http://localhost:5173
- API: http://localhost:8080/api

> **Windows:** se o backend não subir com `Feature not supported: "AUTO_SERVER=TRUE..."`,
> sua cópia está desatualizada — a URL do H2 não usa mais `AUTO_SERVER` (era incompatível com
> o lock de arquivo do Windows).

### Credenciais demo

| Perfil | Email | Senha |
|---|---|---|
| Treinador | coach@trainlab.app | coach1234 |
| Atleta (triatleta) | marina@trainlab.app | atleta1234 |
| Atleta (corrida) | carlos@trainlab.app | atleta1234 |
| Atleta (bike) | ana@trainlab.app | atleta1234 |
| Atleta (natação) | paula@trainlab.app | atleta1234 |

## PostgreSQL com Docker

Sem Docker por enquanto o backend usa H2 em `backend/data/`. Com Docker instalado:

```bash
docker compose up -d db
cd backend && SPRING_PROFILES_ACTIVE=postgres mvn spring-boot:run
```

## Deploy

A stack completa de produção (Postgres + API + SPA com HTTPS automático) está em
[`docker-compose.yml`](./docker-compose.yml), e o passo a passo em
[**DEPLOY.md**](./DEPLOY.md).

## Estrutura

```
backend/    API Spring Boot (domínio, zonas, treinos, planejamento, seed)
frontend/   SPA React (dashboard, atletas, biblioteca, construtor de treino)
scripts/    utilitários de desenvolvimento (dev.sh e dev.ps1)
docs/       referência visual e amostras (docs/samples/sample-run.tcx)
SPEC.md     especificação técnica (contrato da API e regras de negócio)
```

## Funcionalidades (v6)

- **Treinador**: dashboard com plantel e carga semanal; ficha 360 (objetivo, prova,
  disponibilidade, limiares e zonas por esporte, métricas diárias); biblioteca de
  treinos com TSS estimado e treinos individuais por atleta.
- **Construtor de treino**: blocos com repetições, steps com alvos por zona/percentual/RPE,
  faixas reais das zonas do atleta (ex.: `Z2 · 141–148 bpm`), agendamento na mesma ação.
- **Calendário**: grade mensal SEG→DOM + resumo semanal (CTL/ATL/TSB, TSS, duração),
  arrastar sessões entre dias, concluir/duplicar/remover.
- **Análises**: PMC (CTL/ATL/TSB), TSS/duração/distância por semana, tempo em zonas,
  distribuição por esporte, recordes e métricas fisiológicas.
- **Analisar treino**: importe TCX/GPX/FIT e veja resumo, NP/IF/VI/EF/Pw:Hr/NGP,
  gráfico por métrica, zonas, voltas/splits e comparação planejado × realizado.

## Documentação

A fonte da verdade é o [SPEC.md](./SPEC.md): modelo de domínio, fórmulas de
zonas (FC, pace, potência, CSS), contrato REST e critérios de aceite.
