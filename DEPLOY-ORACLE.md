# Deploy na Oracle Cloud (Always Free)

A Oracle tem o free tier mais generoso para este projeto: uma VM **ARM com até 4 OCPU e 24 GB
de RAM**, sem prazo e sem cobrança. É folga suficiente para compilar o backend e o frontend no
próprio servidor.

> O passo a passo genérico (Docker, Caddy, backup, atualização) está no [DEPLOY.md](./DEPLOY.md).
> Este arquivo cobre o que é **específico da Oracle**.

## 0. Antes de tudo: o código precisa estar no GitHub

O servidor vai clonar o repositório. Confirme que os commits locais estão publicados:

```bash
git push
```

## 1. Conta Oracle Cloud

1. Crie a conta em <https://signup.cloud.oracle.com> (exige cartão para verificação — o
   Always Free não cobra).
2. **Escolha bem a home region** (ex.: São Paulo). Ela não pode ser trocada depois, e a
   latência do atleta depende dela.
3. Aguarde a ativação (leva de minutos a algumas horas).

## 2. Criar a VM

No console: **Compute → Instances → Create instance**.

| Campo | Valor |
|---|---|
| Name | `trainlab` |
| Image | **Canonical Ubuntu 24.04** (aarch64) |
| Shape | **VM.Standard.A1.Flex** — 2 OCPU / 12 GB (dentro do Always Free) |
| Boot volume | 50 GB (o free tier dá 200 GB no total) |
| Networking | criar VCN, **Assign a public IPv4 address** |
| SSH keys | *Generate a key pair* → **baixe a chave privada** |

> **"Out of host capacity"** é comum com ARM. Tente outro *Availability Domain*, reduza para
> 1 OCPU / 6 GB, ou tente novamente em alguns minutos.

Depois de criada, anote o **IP público** e transforme-o em **reserved public IP**
(Instance → Attached VNICs → IP address → *Reserved*). Sem isso o IP muda se você parar e
iniciar a instância.

## 3. Abrir as portas (duas camadas!)

A Oracle bloqueia tudo por padrão **em dois lugares**. Precisa dos dois:

**a) Security List da VCN** (console): Networking → VCN → Security Lists → Default →
**Add Ingress Rule**:

| Source | Protocol | Destination Port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

**b) Firewall do sistema** (dentro da VM): as imagens Ubuntu da Oracle têm uma regra
`REJECT` antes das `ACCEPT`. O script `scripts/server-setup.sh` corrige isso — ou faça à mão:

```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo apt-get install -y iptables-persistent && sudo netfilter-persistent save
```

## 4. Acessar e preparar

```bash
chmod 600 ~/Downloads/sua-chave.key
ssh -i ~/Downloads/sua-chave.key ubuntu@SEU_IP
```

Dentro da VM:

```bash
git clone https://github.com/rafaelb1451/trainlab.git
cd trainlab
bash scripts/server-setup.sh
```

Saia e entre de novo no SSH (para valer o grupo `docker`).

## 5. Domínio

O Caddy precisa de um nome para emitir certificado — IP puro não funciona com HTTPS
automático. O caminho grátis é o **DuckDNS**:

1. <https://www.duckdns.org> → login → crie `trainlab` → aponte para o IP da VM
2. Você fica com `trainlab.duckdns.org`

## 6. Configurar e subir

```bash
cp .env.example .env
nano .env
```

O mínimo:

```env
APP_DOMAIN=trainlab.duckdns.org
ACME_EMAIL=seu@email.com
APP_BASE_URL=https://trainlab.duckdns.org
POSTGRES_PASSWORD=<senha forte>
JWT_SECRET=<openssl rand -base64 48>
INTEGRATION_SECRET=<openssl rand -base64 48>
BOOTSTRAP_COACH_EMAIL=seu@email.com
BOOTSTRAP_COACH_PASSWORD=<senha forte>
```

Depois:

```bash
docker compose up -d --build
```

A primeira build leva de 5 a 10 minutos na ARM. Acompanhe com `docker compose logs -f app`.

## 7. Verificar

```bash
docker compose ps
curl -s https://trainlab.duckdns.org/api/health    # {"status":"ok",...}
```

Abra `https://trainlab.duckdns.org`, entre com o e-mail/senha do `BOOTSTRAP_COACH_*` e
**apague a senha do bootstrap do `.env`** em seguida (`docker compose up -d app`).

## Pegadinhas desta nuvem

| Problema | Causa | Solução |
|---|---|---|
| Site não abre, mas `curl localhost` funciona | porta fechada no Security List **ou** no iptables | refaça o passo 3 (as duas camadas) |
| IP muda sozinho | IP efêmero | reservar o IP (passo 2) |
| `Out of host capacity` ao criar a VM | falta de ARM na região | outro AD, menos OCPU, ou tentar depois |
| Build morre por falta de memória | VM de 1 GB (AMD micro) | use ARM com ≥ 6 GB, ou o script cria swap |
| Certificado não é emitido | DNS ainda não propagou | `dig +short trainlab.duckdns.org` deve retornar o IP |

## Custo

Dentro do Always Free: **R$ 0/mês**. O que pode gerar cobrança é sair das limites (mais de
4 OCPU ARM, mais de 200 GB de disco, IP reservado ocioso em outra instância) — o console
mostra os limites em *Billing → Cost Analysis*.
