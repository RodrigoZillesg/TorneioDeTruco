# 📝 PROCESSO DE DEPLOY REALIZADO - TORNEIO DE TRUCO

## Contexto
Deploy realizado em 30/08/2024 do sistema Torneio de Truco no EasyPanel.

## Passos Executados

### 1. Preparação do Código
```bash
# Removido arquivo problemático "nul"
rm nul

# Criado .gitignore
cat > .gitignore << 'EOF'
node_modules/
package-lock.json
.DS_Store
Thumbs.db
nul
*.log
.env
.env.local
.claude/
.mcp.json
.playwright-mcp/
*.tmp
*.bak
teste-*.html
EOF
```

### 2. Inicialização Git
```bash
git init
git config user.email "rrzillesg@gmail.com"
git config user.name "Torneio Truco"
git add -A
git commit -m "Deploy inicial do Torneio de Truco"
```

### 3. Criação do ZIP para Deploy
```bash
# Primeira tentativa (falhou por incluir pasta assets vazia)
powershell -Command "Compress-Archive -Path 'index.html','package.json','server.js','js','css','assets','manifest.json' -DestinationPath 'truco-deploy.zip' -Force"

# Segunda tentativa (sucesso - sem pasta assets)
powershell -Command "Compress-Archive -Path 'index.html','package.json','server.js','js','manifest.json' -DestinationPath 'truco-deploy2.zip' -Force"
```

### 4. Processo no EasyPanel via Playwright

#### 4.1 Login
- URL: http://103.199.187.87:3000/
- Projeto "truco" já existente
- Serviço "torneio-de-truco" criado

#### 4.2 Upload do Código
1. Navegado para: `/projects/truco/app/torneio-de-truco/init/source`
2. Selecionado opção "Upload"
3. Clicado na área de drag-and-drop
4. Upload do arquivo `truco-deploy2.zip`

#### 4.3 Configuração de Build
1. Selecionado "Nixpacks" (detecção automática para Node.js)
2. Configurações inseridas:
   - Comando de Instalação: `npm install`
   - Comando de Início: `npm start`
3. Clicado em "Salvar"

#### 4.4 Deploy
1. Aguardado botão "Implantar" ficar disponível
2. Clicado em "Implantar"
3. Recebida confirmação: "Aplicativo implantado"

## Problemas Encontrados e Soluções

### Problema 1: Arquivo "nul"
**Erro**: `error: unable to index file 'nul'`
**Solução**: Removido arquivo e adicionado ao .gitignore

### Problema 2: Upload com pasta assets
**Erro**: `EISDIR: illegal operation on a directory, open '/etc/easypanel/projects/truco/torneio-de-truco/code/assets/icons/'`
**Solução**: Criado novo ZIP sem a pasta assets

### Problema 3: Interface EasyPanel muito grande
**Erro**: Snapshots do Playwright excediam 25000 tokens
**Solução**: Usado comandos mais diretos e específicos, evitando snapshots completos

## Configurações Finais

### package.json usado:
```json
{
  "name": "torneio-truco",
  "version": "1.0.0",
  "description": "Sistema de gerenciamento de torneios de truco com sincronização em tempo real",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "cors": "^2.8.5"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=7.0.0"
  }
}
```

### URLs Geradas:
- **Aplicação**: https://truco-torneio-de-truco.qczjfz.easypanel.host/
- **Painel Admin**: http://103.199.187.87:3000/projects/truco/app/torneio-de-truco

## Métricas Observadas
- CPU: 0.0% - 0.2%
- Memória: 57.5 MB - 62.1 MB
- I/O de Rede: 292.6 KB / 3.8 KB

## Tempo Total
- Preparação: ~5 minutos
- Upload e Configuração: ~10 minutos
- Deploy e Inicialização: ~2 minutos
- **Total**: ~17 minutos

## Lições Aprendidas

1. **Verificar estrutura de pastas** antes de criar ZIP
2. **Nixpacks é ideal** para projetos Node.js (detecção automática)
3. **Upload direto é mais simples** que configurar Git para deploy inicial
4. **EasyPanel gera URL automática** com HTTPS incluído
5. **Playwright funciona bem** para automação, mas interfaces pesadas precisam de estratégias especiais

## Próximos Passos para Atualizações

Para atualizar o código:
1. Criar novo ZIP com alterações
2. Acessar aba "Fonte" do serviço
3. Upload do novo ZIP
4. Clicar em "Implantar"

OU configurar Git para deploys automáticos.

---
**Deploy realizado com sucesso em**: 30/08/2024
**Por**: Sistema automatizado via Playwright