# Deploy

Guia para colocar o TrainLab no ar em um servidor próprio.

## Arquitetura

```
internet ──► Caddy (443, HTTPS automático)
                ├── /api/*  ──► app (Spring Boot :8080) ──► Postgres
                └── resto   ──► SPA (arquivos estáticos)
```

Três containers: `web` (Caddy + SPA), `app` (API) e `db` (PostgreSQL). Só o `web` expõe
portas; o banco e a API ficam na rede interna do Docker.

## Pré-requisitos

- VPS com **2 GB de RAM** (testado o dimensionamento; 1 GB passa aperto por causa do build)
- Docker + Docker Compose plugin
- Um domínio com o registro **A** apontando para o IP do servidor
- Conta em um provedor de e-mail transacional com o domínio verificado (Resend, Brevo, SES…)

## Passo a passo

### 1. Servidor

```bash
# Ubuntu 24.04
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

### 2. Código

```bash
git clone https://github.com/rafaelb1451/trainlab.git
cd trainlab
```

### 3. Configuração

```bash
cp .env.example .env
```

Gere os segredos e cole no `.env`:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # INTEGRATION_SECRET
```

Preencha também `APP_DOMAIN`, `ACME_EMAIL`, `APP_BASE_URL`, a senha do Postgres e o
primeiro treinador (`BOOTSTRAP_COACH_*`).

### 4. Subir

```bash
docker compose up -d --build
```

A primeira subida compila o backend (Maven) e o frontend (Vite) — leva alguns minutos.
O Caddy emite o certificado HTTPS sozinho assim que o DNS estiver propagado.

### 5. Verificar

```bash
docker compose ps
curl -s https://$APP_DOMAIN/api/health      # {"status":"ok", ...}
docker compose logs -f app
```

Abra `https://SEU_DOMINIO` e entre com o e-mail/senha do `BOOTSTRAP_COACH_*`.

**Depois do primeiro login, apague `BOOTSTRAP_COACH_PASSWORD` do `.env` e recrie o container:**

```bash
docker compose up -d app
```

## E-mail

O Resend tem plano gratuito de 3.000 mensagens/mês (100/dia). Depois de verificar o domínio
(SPF + DKIM no DNS), configure no `.env`:

```env
MAIL_TRANSPORT=smtp
SPRING_MAIL_HOST=smtp.resend.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=resend
SPRING_MAIL_PASSWORD=re_...
MAIL_FROM=no-reply@seudominio.com
```

Sem SMTP configurado, as mensagens ficam registradas no `mail_outbox` e nada é enviado —
útil para testar, inútil para o atleta receber o link de confirmação.

## Backup

O banco é um volume Docker. Backup diário com `pg_dump`:

```bash
docker compose exec -T db pg_dump -U trainlab trainlab | gzip > backup-$(date +%F).sql.gz
```

Um cron simples:

```cron
0 3 * * * cd /home/deploy/trainlab && docker compose exec -T db pg_dump -U trainlab trainlab | gzip > /home/deploy/backups/trainlab-$(date +\%F).sql.gz
```

Faça também backup de `.env` (guarda os segredos) e dos volumes `caddy_data`
(certificados) — os dois em local seguro, fora do servidor.

## Atualização

```bash
git pull
docker compose up -d --build
```

O `app` reinicia; o Postgres mantém os dados no volume `pgdata`.

## Checklist de produção

| Item | Estado |
|---|---|
| HTTPS com certificado automático | ✅ Caddy |
| Cookie `Secure` + `SameSite=Strict` | ✅ `COOKIE_SECURE=true` |
| Cabeçalhos de segurança (CSP, HSTS, etc.) | ✅ no `Caddyfile` |
| Seed desligado | ✅ `SEED_ENABLED=false` |
| Senhas com BCrypt, tokens cifrados | ✅ |
| Confirmação de e-mail | ✅ |
| Rate limit no login | ✅ (5 falhas / 15 min) |
| Healthcheck | ✅ `/api/health` |
| Backup do banco | ⚠️ manual (cron acima) |
| Migrations | ⚠️ **`ddl-auto: update`** — trocar por Flyway quando o modelo estabilizar |
| Monitoramento / alertas | ⚠️ não configurado |
| Logs centralizados | ⚠️ `docker compose logs` apenas |

## Troubleshooting

**`APP_DOMAIN` não emite certificado.** DNS ainda não propagou ou a porta 80 está fechada.
Confira com `dig +short app.seudominio.com` e `docker compose logs web`.

**App reinicia em loop.** Veja `docker compose logs app`. Quase sempre é variável faltando
(`JWT_SECRET`, `INTEGRATION_SECRET` ou `POSTGRES_PASSWORD`) — o compose falha explicitamente
quando elas não existem.

**Esqueci a senha do treinador.** Recrie com `BOOTSTRAP_COACH_*` apenas se não houver nenhum
treinador; caso contrário, altere a senha pelo banco (`password_hash` é BCrypt) ou implemente
um fluxo de recuperação.

**Sessões caem a cada deploy.** Defina `JWT_SECRET` — sem ele o servidor gera uma chave
aleatória nova a cada boot.

**Integrações do Intervals.icu param de funcionar após restart.** Defina
`INTEGRATION_SECRET`; sem ele a chave local vive em `./data/integration.key`, que não persiste
fora do container.
