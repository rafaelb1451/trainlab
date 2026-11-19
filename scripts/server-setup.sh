#!/usr/bin/env bash
# Prepara uma VM Ubuntu (Oracle Cloud Always Free ou qualquer VPS) para rodar o TrainLab.
#
#   bash scripts/server-setup.sh
#
# Faz tres coisas:
#   1. instala Docker + compose plugin
#   2. abre 80/443 no firewall do sistema (a Oracle bloqueia tudo menos 22 por padrao)
#   3. cria swap se a maquina tiver pouca RAM (o build do Maven precisa de folga)
#
# Nao mexe no Security List da VCN: isso e' feito no console da Oracle (ver DEPLOY-ORACLE.md).

set -euo pipefail

echo "==> Verificando sistema"
if ! command -v apt-get >/dev/null; then
  echo "Este script assume Ubuntu/Debian (apt-get nao encontrado)." >&2
  exit 1
fi

echo "==> Instalando Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
else
  echo "    docker ja instalado: $(docker --version)"
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERRO: o plugin 'docker compose' nao esta disponivel." >&2
  exit 1
fi

if [ "$(id -u)" -eq 0 ]; then
  usermod -aG docker "${SUDO_USER:-root}" || true
else
  sudo usermod -aG docker "$USER" || true
fi

echo "==> Abrindo portas 80 e 443 no firewall do sistema"
sudo DEBIAN_FRONTEND=noninteractive apt-get update -y -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq iptables-persistent >/dev/null

# As imagens da Oracle tem uma regra REJECT antes das ACCEPT; -I no topo resolve.
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save >/dev/null

echo "==> Memoria disponivel"
mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
echo "    ${mem_mb} MB"

if [ "$mem_mb" -lt 4096 ] && [ ! -f /swapfile ]; then
  echo "==> Criando swap de 2 GB (RAM abaixo de 4 GB)"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
else
  echo "    swap nao necessario"
fi

echo
echo "Pronto."
echo "  1. saia e entre de novo no SSH (para valer o grupo docker)"
echo "  2. clone o repositorio e configure o .env"
echo "  3. docker compose up -d --build"
