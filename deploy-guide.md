# Guia de Deploy - Sistema Helpdesk IT

Este guia fornece instruções completas para fazer deploy do sistema de helpdesk em um servidor Linux para produção.

## 📋 Visão Geral do Sistema

- **Frontend:** React + TypeScript + Vite
- **Backend:** Express.js + TypeScript + REST API
- **Banco de Dados:** PostgreSQL + Drizzle ORM
- **Autenticação:** Sistema básico com roles (técnico/admin)
- **UI:** Tailwind CSS + shadcn/ui
- **Upload de Arquivos:** Uppy + multer

## 🖥️ Requisitos do Sistema

### Hardware Mínimo
- **RAM:** 2GB (recomendado 4GB+)
- **CPU:** 1 core (recomendado 2+ cores)
- **Armazenamento:** 10GB livres (recomendado 20GB+)
- **Rede:** Acesso à internet para instalação de dependências

### Software Obrigatório
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js:** v18.0+ (recomendado v20+)
- **PostgreSQL:** v13+ (recomendado v15+)
- **Nginx:** v1.18+ (proxy reverso)
- **PM2:** Gerenciador de processos Node.js

## 🚀 Preparação do Servidor

### 1. Atualizar Sistema
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Instalar Node.js
```bash
# Usando NodeSource Repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### 3. Instalar PostgreSQL
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib -y

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb
```

### 4. Instalar Nginx
```bash
# Ubuntu/Debian
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y
```

### 5. Instalar PM2 Globalmente
```bash
sudo npm install -g pm2
```

## 🗃️ Configuração do Banco de Dados

### 1. Configurar PostgreSQL
```bash
# Iniciar e habilitar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Acessar como usuário postgres
sudo -u postgres psql
```

### 2. Criar Banco de Dados e Usuário
```sql
-- No prompt do PostgreSQL
CREATE DATABASE helpdesk_production;
CREATE USER helpdesk_user WITH PASSWORD 'sua_senha_super_segura';
GRANT ALL PRIVILEGES ON DATABASE helpdesk_production TO helpdesk_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO helpdesk_user;
ALTER USER helpdesk_user CREATEDB;
\q
```

### 3. Configurar Acesso ao PostgreSQL
```bash
# Editar pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Adicionar linha (substitua a versão correta):
local   helpdesk_production   helpdesk_user                     md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### 4. Testar Conexão
```bash
psql -h localhost -U helpdesk_user -d helpdesk_production
# Digite a senha quando solicitado
```

## 📁 Deploy da Aplicação

### 1. Criar Usuário para Aplicação
```bash
sudo adduser helpdesk
sudo usermod -aG sudo helpdesk
```

### 2. Clonar/Transferir Código
```bash
# Como usuário helpdesk
su - helpdesk
mkdir -p /home/helpdesk/app
cd /home/helpdesk/app

# Copiar arquivos da aplicação aqui
# Ou clonar do repositório Git
```

### 3. Instalar Dependências
```bash
cd /home/helpdesk/app
npm install --production
```

### 4. Configurar Variáveis de Ambiente
```bash
# Criar arquivo .env
nano .env
```

**Conteúdo do arquivo .env:**
```env
# Configuração do Banco de Dados
DATABASE_URL="postgresql://helpdesk_user:sua_senha_super_segura@localhost:5432/helpdesk_production"

# Configuração da Aplicação
NODE_ENV=production
PORT=3000

# Configuração de Sessão (gerar uma chave segura)
SESSION_SECRET="sua_chave_sessao_super_segura_aqui"

# Configuração de Upload (opcional)
UPLOAD_PATH="/home/helpdesk/app/uploads"

# Google Cloud Storage (se usando)
# GOOGLE_CLOUD_PROJECT_ID="seu-projeto"
# GOOGLE_CLOUD_STORAGE_BUCKET="seu-bucket"
# GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

### 5. Executar Migração do Banco
```bash
# Garantir que o schema está sincronizado
npm run db:push --force
```

### 6. Build da Aplicação
```bash
# Build do frontend e backend
npm run build
```

### 7. Criar Dados Iniciais (Usuários Administradores)
```sql
-- Conectar ao banco
psql -h localhost -U helpdesk_user -d helpdesk_production

-- Inserir usuário administrador
INSERT INTO users (username, password, name, email, role) 
VALUES ('admin', 'admin123', 'Administrador', 'admin@empresa.com', 'admin');

-- Inserir técnico exemplo
INSERT INTO users (username, password, name, email, role) 
VALUES ('tecnico1', 'tech123', 'Técnico João', 'joao@empresa.com', 'technician');

\q
```

## ⚙️ Configuração do PM2

### 1. Criar Arquivo de Configuração PM2
```bash
nano /home/helpdesk/app/ecosystem.config.js
```

**Conteúdo do arquivo:**
```javascript
module.exports = {
  apps: [{
    name: 'helpdesk',
    script: './dist/index.js',
    cwd: '/home/helpdesk/app',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/helpdesk/app/logs/err.log',
    out_file: '/home/helpdesk/app/logs/out.log',
    log_file: '/home/helpdesk/app/logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
}
```

### 2. Criar Diretório de Logs
```bash
mkdir -p /home/helpdesk/app/logs
```

### 3. Iniciar Aplicação
```bash
cd /home/helpdesk/app
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Configuração do Nginx

### 1. Criar Configuração do Site
```bash
sudo nano /etc/nginx/sites-available/helpdesk
```

**Conteúdo do arquivo:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    
    client_max_body_size 50M;
    
    # Logs
    access_log /var/log/nginx/helpdesk.access.log;
    error_log /var/log/nginx/helpdesk.error.log;
    
    # Proxy para aplicação Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Servir arquivos estáticos diretamente
    location /uploads/ {
        alias /home/helpdesk/app/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

### 2. Habilitar Site
```bash
sudo ln -s /etc/nginx/sites-available/helpdesk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Configuração SSL (Opcional mas Recomendado)

### 1. Instalar Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Obter Certificado SSL
```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

## 🛡️ Configuração de Segurança

### 1. Configurar Firewall
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw allow 5432/tcp  # PostgreSQL (apenas se necessário remotamente)
```

### 2. Configurar PostgreSQL para Produção
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

**Configurações recomendadas:**
```ini
# Limitar conexões apenas local (se não precisar de acesso remoto)
listen_addresses = 'localhost'

# Configurações de performance
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### 3. Backup Automático do Banco
```bash
# Criar script de backup
sudo nano /home/helpdesk/backup-db.sh
```

**Conteúdo do script:**
```bash
#!/bin/bash
BACKUP_DIR="/home/helpdesk/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U helpdesk_user -d helpdesk_production > $BACKUP_DIR/helpdesk_$DATE.sql

# Manter apenas backups dos últimos 7 dias
find $BACKUP_DIR -name "helpdesk_*.sql" -mtime +7 -delete

echo "Backup criado: helpdesk_$DATE.sql"
```

```bash
chmod +x /home/helpdesk/backup-db.sh

# Adicionar ao cron para backup diário às 2h
crontab -e
# Adicionar linha:
0 2 * * * /home/helpdesk/backup-db.sh
```

## 🚀 Comandos de Deploy

### Deploy Inicial
```bash
#!/bin/bash
# Script de deploy inicial

echo "=== DEPLOY INICIAL HELPDESK ==="

# 1. Parar aplicação se estiver rodando
pm2 stop helpdesk || true

# 2. Backup do banco
/home/helpdesk/backup-db.sh

# 3. Instalar dependências
npm install --production

# 4. Build da aplicação
npm run build

# 5. Sincronizar schema do banco
npm run db:push --force

# 6. Iniciar aplicação
pm2 restart helpdesk || pm2 start ecosystem.config.js

echo "=== DEPLOY CONCLUÍDO ==="
```

### Deploy de Atualização
```bash
#!/bin/bash
# Script de atualização

echo "=== ATUALIZANDO HELPDESK ==="

# 1. Backup
/home/helpdesk/backup-db.sh

# 2. Parar aplicação
pm2 stop helpdesk

# 3. Atualizar código (se usando Git)
# git pull origin main

# 4. Instalar novas dependências
npm install --production

# 5. Build
npm run build

# 6. Atualizar banco se necessário
npm run db:push

# 7. Reiniciar aplicação
pm2 restart helpdesk

echo "=== ATUALIZAÇÃO CONCLUÍDA ==="
```

## 📊 Monitoramento e Logs

### 1. Monitorar Aplicação
```bash
# Status da aplicação
pm2 status

# Logs em tempo real
pm2 logs helpdesk

# Métricas
pm2 monit

# Reiniciar se necessário
pm2 restart helpdesk
```

### 2. Logs do Sistema
```bash
# Logs do Nginx
sudo tail -f /var/log/nginx/helpdesk.access.log
sudo tail -f /var/log/nginx/helpdesk.error.log

# Logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log

# Logs da aplicação
tail -f /home/helpdesk/app/logs/combined.log
```

## 🔧 Solução de Problemas Comuns

### 1. Aplicação não inicia
```bash
# Verificar logs
pm2 logs helpdesk --lines 100

# Verificar variáveis de ambiente
pm2 show helpdesk

# Verificar porta
netstat -tlnp | grep 3000
```

### 2. Erro de conexão com banco
```bash
# Testar conexão manual
psql -h localhost -U helpdesk_user -d helpdesk_production

# Verificar status PostgreSQL
sudo systemctl status postgresql

# Verificar logs PostgreSQL
sudo journalctl -u postgresql
```

### 3. Nginx não consegue conectar
```bash
# Verificar configuração
sudo nginx -t

# Verificar status
sudo systemctl status nginx

# Reiniciar se necessário
sudo systemctl restart nginx
```

### 4. Performance baixa
```bash
# Monitorar recursos
htop
iotop

# Otimizar PostgreSQL
sudo nano /etc/postgresql/*/main/postgresql.conf

# Aumentar worker processes no PM2
# Editar ecosystem.config.js
```

## 📝 Comandos de Manutenção

### Backup Manual
```bash
# Backup completo
pg_dump -h localhost -U helpdesk_user -d helpdesk_production > backup_$(date +%Y%m%d).sql

# Backup apenas dados
pg_dump -h localhost -U helpdesk_user -d helpdesk_production --data-only > data_backup_$(date +%Y%m%d).sql
```

### Restaurar Backup
```bash
# Restaurar backup completo
psql -h localhost -U helpdesk_user -d helpdesk_production < backup_20250903.sql

# Restaurar apenas dados
psql -h localhost -U helpdesk_user -d helpdesk_production < data_backup_20250903.sql
```

### Limpeza de Logs
```bash
# Limpar logs da aplicação
pm2 flush helpdesk

# Limpar logs antigos do sistema
sudo journalctl --vacuum-time=30d
```

## 🌐 URLs e Acesso

Após o deploy completo, o sistema estará disponível em:

- **URL Principal:** `http://seu-dominio.com` ou `https://seu-dominio.com`
- **Login Admin:** 
  - Usuário: `admin`
  - Senha: `admin123` (ALTERE IMEDIATAMENTE)
- **Login Técnico:**
  - Usuário: `tecnico1`
  - Senha: `tech123` (ALTERE IMEDIATAMENTE)

### Rotas da Aplicação:
- `/` - Página inicial
- `/user` - Dashboard do usuário
- `/technician` - Dashboard do técnico
- `/admin` - Dashboard do administrador

## ⚠️ Configurações de Segurança Importantes

1. **ALTERE TODAS AS SENHAS PADRÃO** imediatamente após o deploy
2. Configure o `SESSION_SECRET` com uma chave forte e única
3. Considere implementar rate limiting
4. Configure backup automático
5. Monitore logs de segurança regularmente
6. Mantenha o sistema sempre atualizado

## 📞 Suporte e Manutenção

Para manutenção contínua:
- Monitore logs diariamente
- Execute backups automáticos
- Atualize dependências mensalmente
- Monitore performance e recursos
- Implemente alertas de monitoramento

---

**Desenvolvido para produção - Sistema Helpdesk IT**
*Guia atualizado em: Setembro 2025*