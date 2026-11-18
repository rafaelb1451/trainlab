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

Pré-requisitos: JDK 21 (`~/.jdks/temurin21/...`), Node 22+, Maven 3.9+.

```bash
# tudo junto
./scripts/dev.sh

# ou separado
cd backend  && JAVA_HOME=~/.jdks/temurin21/jdk-21.0.13.1+2 mvn spring-boot:run
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8080/api

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
docker compose up -d
cd backend && SPRING_PROFILES_ACTIVE=postgres JAVA_HOME=~/.jdks/temurin21/jdk-21.0.13.1+2 mvn spring-boot:run
```

## Estrutura

```
backend/    API Spring Boot (domínio, zonas, treinos, planejamento, seed)
frontend/   SPA React (dashboard, atletas, biblioteca, construtor de treino)
scripts/    utilitários de desenvolvimento
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
