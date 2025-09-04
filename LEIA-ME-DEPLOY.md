# 🚀 Como Usar os Arquivos de Deploy

Este diretório contém todos os arquivos necessários para fazer deploy do seu sistema de helpdesk em produção.

## 📁 Arquivos Criados

### 📖 Documentação
- **`deploy-guide.md`** - Guia completo de deploy (LEIA PRIMEIRO!)
- **`LEIA-ME-DEPLOY.md`** - Este arquivo com instruções básicas

### ⚙️ Configuração
- **`.env.example`** - Exemplo de variáveis de ambiente (copie para `.env`)
- **`ecosystem.config.js`** - Configuração do PM2 para produção
- **`nginx.conf.example`** - Configuração do Nginx (copie para `/etc/nginx/sites-available/`)

### 🛠️ Scripts de Deploy
- **`scripts/deploy-inicial.sh`** - Execute para primeiro deploy
- **`scripts/deploy-atualizacao.sh`** - Execute para atualizações
- **`scripts/backup-banco.sh`** - Backup automático do banco
- **`scripts/restaurar-backup.sh`** - Restaurar backup do banco

### 🗃️ SQL
- **`sql/usuarios-iniciais.sql`** - Script para criar usuários iniciais

## 🏃‍♂️ Início Rápido

### 1. Preparação
```bash
# 1. Copie todos os arquivos para seu servidor
# 2. Configure as variáveis de ambiente
cp .env.example .env
nano .env

# 3. Configure o Nginx
sudo cp nginx.conf.example /etc/nginx/sites-available/helpdesk
sudo ln -s /etc/nginx/sites-available/helpdesk /etc/nginx/sites-enabled/
```

### 2. Deploy Inicial
```bash
# Execute o script de deploy inicial
./scripts/deploy-inicial.sh
```

### 3. Configurar Nginx e SSL
```bash
# Testar e reiniciar Nginx
sudo nginx -t
sudo systemctl restart nginx

# Configurar SSL (opcional mas recomendado)
sudo certbot --nginx -d seu-dominio.com
```

### 4. Criar Usuários Iniciais
```bash
# Executar SQL de usuários iniciais
psql -h localhost -U helpdesk_user -d helpdesk_production -f sql/usuarios-iniciais.sql
```

## 🔄 Atualizações

Para atualizar o sistema:
```bash
./scripts/deploy-atualizacao.sh
```

## 💾 Backup e Restauração

### Fazer Backup
```bash
./scripts/backup-banco.sh
```

### Restaurar Backup
```bash
./scripts/restaurar-backup.sh /caminho/para/backup.sql.gz
```

## 📊 Monitoramento

```bash
# Status da aplicação
pm2 status

# Logs em tempo real
pm2 logs helpdesk

# Métricas detalhadas
pm2 monit
```

## 🆘 Problemas Comuns

### Aplicação não inicia
```bash
pm2 logs helpdesk --lines 50
```

### Erro de banco
```bash
# Testar conexão
psql -h localhost -U helpdesk_user -d helpdesk_production

# Ver logs PostgreSQL
sudo journalctl -u postgresql
```

### Nginx não conecta
```bash
# Testar configuração
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/helpdesk.error.log
```

## 🔐 Segurança

**IMPORTANTE:** Após o deploy:
1. ✅ Altere TODAS as senhas padrão
2. ✅ Configure `SESSION_SECRET` único
3. ✅ Configure firewall (ufw)
4. ✅ Configure backups automáticos
5. ✅ Configure SSL com Certbot

## 📞 Suporte

- Consulte o **`deploy-guide.md`** para instruções detalhadas
- Verifique os logs: `pm2 logs helpdesk`
- Monitor PostgreSQL: `sudo systemctl status postgresql`
- Monitor Nginx: `sudo systemctl status nginx`

---

**✨ Seu sistema de helpdesk está pronto para produção!**

*URLs de acesso após deploy:*
- **Público:** `https://seu-dominio.com`
- **Admin:** Login com `admin` / `admin123` (ALTERE!)
- **Técnico:** Login com `tecnico1` / `tech123` (ALTERE!)*