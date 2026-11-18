# TrainLab

Plataforma de treinamento personalizado multiesporte (corrida, ciclismo e natação),
inspirada no TrainingPeaks, com perfis de **Treinador** e **Atleta**.

> Status: v1 em desenvolvimento — modo treinador (atletas, limiares/zonas,
> construtor de treino estruturado e biblioteca).

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Java 21 + Spring Boot 4.0.9 (REST, JPA, Security/JWT) |
| Banco | H2 arquivo (dev) · PostgreSQL 17 (via Docker) |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 + dnd-kit |
| Futuro | Importação FIT/TCX/GPX, sync Garmin/Strava |

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

## Documentação

A fonte da verdade é o [SPEC.md](./SPEC.md): modelo de domínio, fórmulas de
zonas (FC, pace, potência, CSS), contrato REST e critérios de aceite.
