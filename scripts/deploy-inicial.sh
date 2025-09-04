#!/bin/bash

# Script de Deploy Inicial - Sistema Helpdesk IT
# Execute este script na primeira instalação

set -e  # Parar em caso de erro

echo "🚀 INICIANDO DEPLOY INICIAL DO SISTEMA HELPDESK"
echo "================================================"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Erro: Node.js não está instalado"
    exit 1
fi

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ Erro: PostgreSQL não está instalado"
    exit 1
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ Erro: PM2 não está instalado. Execute: npm install -g pm2"
    exit 1
fi

# Verificar arquivo .env
if [ ! -f ".env" ]; then
    echo "❌ Erro: Arquivo .env não encontrado"
    echo "Crie o arquivo .env com as variáveis necessárias (consulte o guia)"
    exit 1
fi

echo "✅ Verificações iniciais concluídas"

# 1. Instalar dependências
echo "📦 Instalando dependências..."
npm install --production

# 2. Build da aplicação
echo "🔨 Fazendo build da aplicação..."
npm run build

# 3. Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p logs uploads backups

# 4. Configurar banco de dados
echo "🗃️ Configurando banco de dados..."
npm run db:push --force

# 5. Testar conexão com banco
echo "🔍 Testando conexão com banco..."
node -e "
require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Conexão com banco OK');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro na conexão com banco:', err.message);
    process.exit(1);
  });
"

# 6. Iniciar aplicação com PM2
echo "🚀 Iniciando aplicação..."
if pm2 list | grep -q "helpdesk"; then
    pm2 restart helpdesk
else
    pm2 start ecosystem.config.js
fi

# 7. Salvar configuração PM2
pm2 save

# 8. Configurar PM2 para iniciar no boot
pm2 startup

echo ""
echo "🎉 DEPLOY INICIAL CONCLUÍDO COM SUCESSO!"
echo "========================================"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o Nginx (consulte o guia)"
echo "2. Configure SSL com Certbot"
echo "3. Altere as senhas padrão dos usuários"
echo "4. Configure backups automáticos"
echo ""
echo "🌐 Aplicação rodando na porta 3000"
echo "📊 Monitorar com: pm2 monit"
echo "📝 Ver logs com: pm2 logs helpdesk"
echo ""