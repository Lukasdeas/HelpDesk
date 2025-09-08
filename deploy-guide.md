# Guia de Deploy - Sistema Helpdesk IT

Este guia fornece instruções completas para fazer deploy do sistema de helpdesk em um servidor Linux para produção.

## 📋 Visão Geral do Sistema

- **Frontend:** React + TypeScript + Vite
- **Backend:** Express.js + TypeScript + REST API
- **Banco de Dados:** SQLite + Drizzle ORM (100% local)
- **Autenticação:** Sistema seguro com hash PBKDF2 + roles (técnico/admin)
- **UI:** Tailwind CSS + shadcn/ui
- **Upload de Arquivos:** Multer + armazenamento local
- **Vantagem:** Sistema 100% self-contained, sem dependências externas

## ✅ Funcionalidades Verificadas

Este sistema já foi testado e possui:
- ✅ Sistema de abertura de chamados funcionando
- ✅ Acesso como técnico e administrador funcionando  
- ✅ Acompanhamento de tickets funcionando
- ✅ Sistema de relatórios funcionando
- ✅ Upload e download de arquivos funcionando
- ✅ Autenticação segura com senhas hasheadas
- ✅ Controle de permissões por role
- ✅ Banco SQLite local (sem dependências externas)

## 🖥️ Requisitos do Sistema

### Hardware Mínimo
- **RAM:** 1GB (recomendado 2GB+)
- **CPU:** 1 core (recomendado 2+ cores)
- **Armazenamento:** 5GB livres (recomendado 10GB+)
- **Rede:** Acesso à internet para instalação inicial

### Software Obrigatório
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js:** v18.0+ (recomendado v20+)
- **Nginx:** v1.18+ (proxy reverso)
- **PM2:** Gerenciador de processos Node.js
- **SQLite:** Incluído automaticamente (sem configuração extra)

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

### 3. Instalar Nginx
```bash
# Ubuntu/Debian
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y
```

### 4. Instalar PM2 Globalmente
```bash
sudo npm install -g pm2
```

## 📁 Deploy da Aplicação

### 1. Criar Usuário para Aplicação
```bash
sudo adduser helpdesk
sudo usermod -aG sudo helpdesk
```

### 2. Transferir Código
```bash
# Como usuário helpdesk
su - helpdesk
mkdir -p /home/helpdesk/app
cd /home/helpdesk/app

# Copiar todos os arquivos da aplicação aqui
# Ou usar rsync/scp do seu ambiente de desenvolvimento
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
# Configuração da Aplicação
NODE_ENV=production
PORT=3000

# Configuração de Sessão (gerar uma chave segura)
SESSION_SECRET="sua_chave_sessao_super_segura_aqui"

# Configuração de Upload Local
UPLOAD_PATH="/home/helpdesk/app/uploads"

# Banco SQLite (automático - não precisa configurar)
# O banco será criado automaticamente em: ./helpdesk.db
```

### 5. Criar Diretórios Necessários
```bash
# Criar diretório de uploads
mkdir -p /home/helpdesk/app/uploads
chmod 755 /home/helpdesk/app/uploads

# Criar diretório de logs
mkdir -p /home/helpdesk/app/logs
```

### 6. Build da Aplicação
```bash
# Build do frontend e backend
npm run build
```

### 7. Inicializar Banco SQLite e Criar Usuários
```bash
# O banco SQLite será criado automaticamente na primeira execução
# Para criar usuários iniciais, execute a aplicação uma vez
npm start

# Aguarde alguns segundos e pare com Ctrl+C
# Agora crie os usuários via API
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "name": "Administrador",
    "email": "admin@empresa.com",
    "role": "admin"
  }'

curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tecnico1",
    "password": "tech123",
    "name": "Técnico de TI",
    "email": "tecnico@empresa.com",
    "role": "technician"
  }'
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
    script: './server/index.ts',
    cwd: '/home/helpdesk/app',
    instances: 1,
    exec_mode: 'fork',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/helpdesk/app/logs/err.log',
    out_file: '/home/helpdesk/app/logs/out.log',
    log_file: '/home/helpdesk/app/logs/combined.log',
    time: true,
    max_memory_restart: '512M',
    watch: false,
    autorestart: true
  }]
}
```

### 2. Iniciar Aplicação
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

    # Servir arquivos de upload localmente
    location /uploads/ {
        alias /home/helpdesk/app/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
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

## 🔒 Configuração SSL (Recomendado)

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
```

### 2. Configurar Permissões de Arquivos
```bash
# Proteger banco SQLite
chmod 600 /home/helpdesk/app/helpdesk.db
chown helpdesk:helpdesk /home/helpdesk/app/helpdesk.db

# Proteger uploads
chmod 755 /home/helpdesk/app/uploads
chown helpdesk:helpdesk /home/helpdesk/app/uploads

# Proteger .env
chmod 600 /home/helpdesk/app/.env
chown helpdesk:helpdesk /home/helpdesk/app/.env
```

## 🧪 Testes de Funcionalidades

### 1. Testar Sistema de Autenticação
```bash
# Teste via curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Resposta esperada: {"id":"...","username":"admin","role":"admin"}
```

### 2. Testar Criação de Tickets
```bash
# Teste de abertura de chamado
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Teste do sistema",
    "description":"Testando funcionalidade",
    "sector":"TI",
    "problemType":"software",
    "priority":"medium",
    "requesterName":"Teste User",
    "userEmail":"teste@empresa.com"
  }'
```

### 3. Testar Upload de Arquivos
```bash
# Teste de upload
curl -X POST http://localhost:3000/api/upload/1 \
  -F "file=@/etc/passwd"

# Verificar arquivo foi salvo
ls -la /home/helpdesk/app/uploads/
```

### 4. Testar Relatórios
```bash
# Teste de estatísticas
curl http://localhost:3000/api/stats

# Resposta esperada: {"total":X,"open":Y,"inProgress":Z,"resolved":W}
```

### 5. Testar Acesso Web
```bash
# Verificar se aplicação responde
curl -I http://localhost:3000/

# Verificar se frontend carrega
curl -s http://localhost:3000/ | grep -q "Helpdesk" && echo "✅ Frontend OK" || echo "❌ Frontend erro"
```

## 🚀 Scripts de Deploy Automatizado

### Script de Deploy Inicial
```bash
#!/bin/bash
# Salvar como: /home/helpdesk/deploy-inicial.sh

echo "=== DEPLOY INICIAL HELPDESK ==="

cd /home/helpdesk/app

# 1. Instalar dependências
echo "Instalando dependências..."
npm install --production

# 2. Build da aplicação
echo "Fazendo build..."
npm run build

# 3. Criar diretórios necessários
mkdir -p uploads logs

# 4. Gerar SESSION_SECRET se não existir
if ! grep -q "SESSION_SECRET" .env; then
    echo "SESSION_SECRET=\"$(openssl rand -base64 32)\"" >> .env
fi

# 5. Iniciar aplicação
echo "Iniciando aplicação..."
pm2 start ecosystem.config.js
pm2 save

echo "🎉 DEPLOY INICIAL CONCLUÍDO COM SUCESSO!"
echo "========================================"
echo ""
echo "🌐 Sistema disponível em: http://localhost:3000"
echo ""
echo "⚠️  PRÓXIMOS PASSOS OBRIGATÓRIOS:"
echo "1. Criar usuários iniciais via API (ver documentação)"
echo "2. Configurar Nginx proxy reverso"
echo "3. Configurar SSL com Certbot"
echo "4. Alterar senhas padrão"
```

### Script de Verificação do Sistema
```bash
#!/bin/bash
# Salvar como: /home/helpdesk/verificar-sistema.sh

echo "=== VERIFICAÇÃO DO SISTEMA HELPDESK ==="

# Verificar serviços
echo "1. Verificando serviços..."
systemctl is-active nginx
pm2 status helpdesk

# Verificar banco SQLite
echo "2. Verificando banco SQLite..."
[ -f "/home/helpdesk/app/helpdesk.db" ] && echo "✅ Banco SQLite existe" || echo "❌ Banco SQLite não encontrado"

# Verificar aplicação
echo "3. Testando aplicação..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200" && echo "✅ Aplicação respondendo" || echo "❌ Aplicação não responde"

# Verificar uploads
echo "4. Testando diretório de uploads..."
[ -d "/home/helpdesk/app/uploads" ] && [ -w "/home/helpdesk/app/uploads" ] && echo "✅ Uploads OK" || echo "❌ Problema nos uploads"

# Verificar estatísticas
echo "5. Testando API de estatísticas..."
curl -s http://localhost:3000/api/stats | grep -q "total" && echo "✅ API Stats OK" || echo "❌ API Stats erro"

# Verificar logs
echo "6. Verificando logs recentes..."
tail -5 /home/helpdesk/app/logs/combined.log

echo "=== VERIFICAÇÃO CONCLUÍDA ==="
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

# Logs da aplicação
tail -f /home/helpdesk/app/logs/combined.log
```

### 3. Monitorar Banco SQLite
```bash
# Verificar tamanho do banco
ls -lh /home/helpdesk/app/helpdesk.db

# Verificar integridade
sqlite3 /home/helpdesk/app/helpdesk.db "PRAGMA integrity_check;"

# Verificar tabelas
sqlite3 /home/helpdesk/app/helpdesk.db ".tables"
```

## 🔧 Solução de Problemas Comuns

### 1. Erro de Autenticação "Invalid credentials"
```bash
# Verificar se usuários existem
sqlite3 /home/helpdesk/app/helpdesk.db "SELECT username, role FROM users;"

# Recriar usuários se necessário (via API)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","name":"Admin","email":"admin@empresa.com","role":"admin"}'
```

### 2. Upload de arquivos não funciona
```bash
# Verificar permissões
ls -la /home/helpdesk/app/uploads/
chmod 755 /home/helpdesk/app/uploads/
chown helpdesk:helpdesk /home/helpdesk/app/uploads/

# Verificar espaço em disco
df -h /home/helpdesk/app/

# Testar upload manual
curl -X POST http://localhost:3000/api/upload/test -F "file=@/etc/passwd"
```

### 3. Relatórios não carregam
```bash
# Verificar se há dados
sqlite3 /home/helpdesk/app/helpdesk.db "SELECT COUNT(*) FROM tickets;"

# Testar endpoint de stats
curl http://localhost:3000/api/stats
```

### 4. Performance baixa
```bash
# Monitorar recursos
htop

# Verificar logs de erro
pm2 logs helpdesk --err

# Otimizar SQLite (desfragmentação)
sqlite3 /home/helpdesk/app/helpdesk.db "VACUUM;"
```

### 5. Banco SQLite corrompido
```bash
# Backup antes de qualquer operação
cp /home/helpdesk/app/helpdesk.db /home/helpdesk/app/helpdesk.db.backup

# Verificar integridade
sqlite3 /home/helpdesk/app/helpdesk.db "PRAGMA integrity_check;"

# Reparar banco (se necessário)
sqlite3 /home/helpdesk/app/helpdesk.db ".recover" | sqlite3 /home/helpdesk/app/helpdesk_recovered.db
```

## 💾 Backup e Restauração

### 1. Script de Backup Automático
```bash
# Criar script de backup
cat > /home/helpdesk/backup-helpdesk.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/helpdesk/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup do banco SQLite
cp /home/helpdesk/app/helpdesk.db $BACKUP_DIR/helpdesk_$DATE.db

# Backup dos uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /home/helpdesk/app uploads/

# Backup da configuração
cp /home/helpdesk/app/.env $BACKUP_DIR/env_$DATE.backup

# Manter apenas 7 dias
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.backup" -mtime +7 -delete

echo "Backup criado: $DATE"
echo "Banco: $BACKUP_DIR/helpdesk_$DATE.db"
echo "Uploads: $BACKUP_DIR/uploads_$DATE.tar.gz"
EOF

chmod +x /home/helpdesk/backup-helpdesk.sh

# Adicionar ao cron (backup diário às 2h)
crontab -e
# Adicionar: 0 2 * * * /home/helpdesk/backup-helpdesk.sh
```

### 2. Restaurar Backup
```bash
# Parar aplicação
pm2 stop helpdesk

# Restaurar banco
cp /home/helpdesk/backups/helpdesk_YYYYMMDD_HHMMSS.db /home/helpdesk/app/helpdesk.db

# Restaurar uploads
tar -xzf /home/helpdesk/backups/uploads_YYYYMMDD_HHMMSS.tar.gz -C /home/helpdesk/app/

# Restaurar configuração (se necessário)
cp /home/helpdesk/backups/env_YYYYMMDD_HHMMSS.backup /home/helpdesk/app/.env

# Ajustar permissões
chown helpdesk:helpdesk /home/helpdesk/app/helpdesk.db
chmod 600 /home/helpdesk/app/helpdesk.db

# Reiniciar aplicação
pm2 start helpdesk
```

## 🌐 URLs e Acesso Após Deploy

### Sistema estará disponível em:
- **URL Principal:** `http://seu-dominio.com` ou `https://seu-dominio.com`

### Credenciais Padrão (ALTERE IMEDIATAMENTE):
- **Admin:** 
  - Usuário: `admin`
  - Senha: `admin123`
- **Técnico:**
  - Usuário: `tecnico1` 
  - Senha: `tech123`

### Funcionalidades Disponíveis:
- `/` - Abertura de chamados (usuários externos)
- `/admin` - Dashboard administrativo completo
- `/technician` - Dashboard para técnicos
- `/api/stats` - Estatísticas em JSON
- `/api/tickets` - Lista de tickets via API

## ⚠️ Configurações de Segurança Críticas

### 1. Alterar Senhas Imediatamente
```bash
# Via interface web: Acesse /admin > Usuários
# Ou via API:
curl -X PATCH http://localhost:3000/api/users/admin-id \
  -H "Content-Type: application/json" \
  -d '{"password":"nova_senha_super_segura"}'
```

### 2. Configurar SESSION_SECRET único
```bash
# Gerar chave aleatória
openssl rand -base64 32

# Atualizar .env
nano /home/helpdesk/app/.env
# SESSION_SECRET="chave_gerada_acima"

# Reiniciar aplicação
pm2 restart helpdesk
```

### 3. Configurar Permissões Restritivas
```bash
# Banco SQLite apenas para o usuário helpdesk
chmod 600 /home/helpdesk/app/helpdesk.db
chown helpdesk:helpdesk /home/helpdesk/app/helpdesk.db

# Configurações apenas para o usuário helpdesk
chmod 600 /home/helpdesk/app/.env
chown helpdesk:helpdesk /home/helpdesk/app/.env

# Uploads com permissões adequadas
chmod 755 /home/helpdesk/app/uploads
chown helpdesk:helpdesk /home/helpdesk/app/uploads
```

## 📞 Checklist Final de Deploy

Antes de considerar o deploy concluído, verifique:

- [ ] ✅ Node.js instalado e funcionando
- [ ] ✅ Aplicação Node.js executando via PM2
- [ ] ✅ Nginx proxy reverso configurado
- [ ] ✅ Banco SQLite criado automaticamente
- [ ] ✅ Usuários iniciais criados (admin/tecnico1)
- [ ] ✅ Login admin funcionando (admin/admin123)
- [ ] ✅ Login técnico funcionando (tecnico1/tech123)
- [ ] ✅ Abertura de chamados funcionando
- [ ] ✅ Upload de arquivos funcionando
- [ ] ✅ Relatórios carregando dados
- [ ] ✅ Todas as senhas padrão alteradas
- [ ] ✅ SSL configurado (se aplicável)
- [ ] ✅ Firewall configurado
- [ ] ✅ Backup automático configurado
- [ ] ✅ Logs sendo gerados corretamente
- [ ] ✅ Permissões de arquivo adequadas

## 💡 Vantagens do Sistema Atual

### ✅ Simplicidade de Deploy
- **Sem banco externo:** SQLite incluído, não precisa instalar/configurar PostgreSQL
- **Sem dependências cloud:** Tudo funciona offline após instalação inicial
- **Backup simples:** Apenas um arquivo .db + pasta de uploads
- **Zero configuração de rede:** Não precisa configurar portas de banco

### ✅ Baixos Requisitos
- **RAM mínima:** 1GB é suficiente (vs 2GB+ com PostgreSQL)
- **Sem serviços extras:** Não precisa rodar PostgreSQL daemon
- **Disco:** SQLite é mais eficiente para pequenos volumes
- **CPU:** Menor overhead sem processo de banco separado

### ✅ Manutenção Simples
- **Um só arquivo de banco:** Fácil de fazer backup/restore
- **Logs centralizados:** Tudo nos logs do PM2
- **Deploy atômico:** Parar app → substituir arquivos → iniciar
- **Zero downtime possible:** Com load balancer simples

### ⚠️ Limitações Conhecidas
- **Concorrência:** SQLite tem limite de escritas simultâneas (~100 usuários)
- **Escalabilidade:** Não suporta múltiplos servidores (sem shared storage)
- **Backup online:** Requer parada da aplicação para backup 100% consistente

### 🎯 Casos de Uso Ideais
- **Empresas pequenas/médias:** 5-100 usuários simultâneos
- **Intranets corporativas:** Ambiente controlado
- **Prototipagem rápida:** Deploy em minutos
- **Ambiente único:** Servidor dedicado único

---

**Sistema Helpdesk IT - Deploy Produção Linux**
*Guia atualizado: Setembro 2025*
*Versão: 3.0 - SQLite + 100% Self-Contained*