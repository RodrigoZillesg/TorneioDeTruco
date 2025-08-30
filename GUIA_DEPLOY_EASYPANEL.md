# 📚 GUIA COMPLETO DE DEPLOY NO EASYPANEL

## 🎯 Visão Geral
Este guia documenta o processo completo de deploy de aplicações Node.js no EasyPanel, baseado na experiência bem-sucedida do deploy do sistema Torneio de Truco.

## 📋 Pré-requisitos

### 1. Estrutura do Projeto
```
projeto/
├── package.json        # Dependências e scripts
├── server.js          # Arquivo principal do servidor
├── index.html         # Frontend (se aplicável)
├── js/                # Scripts do frontend
├── css/               # Estilos
└── .gitignore         # Arquivos a ignorar
```

### 2. Package.json Essencial
```json
{
  "name": "nome-do-projeto",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    // outras dependências necessárias
  }
}
```

## 🚀 Processo de Deploy Passo a Passo

### Etapa 1: Preparação Local

#### 1.1 Criar .gitignore
```bash
# Criar arquivo .gitignore com conteúdo essencial
cat > .gitignore << 'EOF'
node_modules/
package-lock.json
.DS_Store
Thumbs.db
*.log
.env
.env.local
.vscode/
.idea/
*.tmp
*.bak
EOF
```

#### 1.2 Inicializar Git (Opcional mas recomendado)
```bash
git init
git add .
git config user.email "seu-email@gmail.com"
git config user.name "Nome do Projeto"
git commit -m "Deploy inicial"
```

#### 1.3 Criar ZIP para Upload
```bash
# Windows PowerShell
powershell -Command "Compress-Archive -Path 'index.html','package.json','server.js','js','css','manifest.json' -DestinationPath 'deploy.zip' -Force"

# Linux/Mac
zip -r deploy.zip index.html package.json server.js js/ css/ manifest.json
```

**IMPORTANTE**: Não incluir pastas vazias ou com estruturas problemáticas (como assets/icons/ vazias)

### Etapa 2: Configuração no EasyPanel

#### 2.1 Acessar o Painel
1. Fazer login no EasyPanel
2. Criar novo projeto ou selecionar existente
3. Criar novo serviço do tipo "App"

#### 2.2 Upload do Código
1. Na página de configuração do serviço, selecionar aba **"Upload"**
2. Clicar na área "Arraste e solte seu arquivo de código aqui (zip)"
3. Selecionar o arquivo `deploy.zip` criado anteriormente
4. Aguardar o upload (mensagem "Carregando...")

#### 2.3 Configuração de Build
1. Após upload, será solicitado o método de build
2. Selecionar **"Nixpacks"** (melhor para Node.js)
3. Configurar os comandos:
   - **Comando de Instalação**: `npm install`
   - **Comando de Build**: (deixar vazio se não houver build)
   - **Comando de Início**: `npm start`
4. Clicar em **"Salvar"**

#### 2.4 Deploy Final
1. Aguardar o botão "Implantar" ficar disponível
2. Clicar em **"Implantar"**
3. Aguardar mensagem "Aplicativo implantado"
4. A aplicação estará disponível no link fornecido

## 🔧 Configurações Avançadas

### Variáveis de Ambiente
Na aba **"Ambiente"** do serviço:
```
NODE_ENV=production
PORT=3000  # EasyPanel gerencia automaticamente
# Adicionar outras variáveis necessárias
```

### Domínio Personalizado
1. Ir para aba **"Domínios"**
2. Adicionar domínio customizado
3. Configurar DNS conforme instruções

### Recursos do Servidor
Na aba **"Recursos"**:
- CPU: Ajustar conforme necessidade
- Memória: Mínimo 256MB para Node.js
- Disco: Conforme tamanho do projeto

## 🔄 Atualizações Futuras

### Método 1: Upload Direto
1. Criar novo ZIP com código atualizado
2. Na aba "Fonte", clicar em "Upload"
3. Fazer upload do novo ZIP
4. Clicar em "Implantar"

### Método 2: Git (Recomendado para Atualizações Frequentes)
1. Configurar repositório Git no EasyPanel
2. Push do código atualizado
3. Deploy automático ou manual

## 📊 Monitoramento

### Verificar Logs
- Clicar no botão **"Logs"** na visão geral do serviço
- Logs em tempo real aparecem no terminal

### Métricas
- CPU, Memória e I/O de Rede visíveis na visão geral
- Histórico disponível na aba "Monitorar"

## ⚠️ Troubleshooting

### Erro: "EISDIR: illegal operation on a directory"
**Solução**: Remover pastas vazias do ZIP ou garantir que todas as pastas tenham arquivos

### Erro: Build falhou
**Verificar**:
1. package.json está correto
2. Todas as dependências estão listadas
3. Comando start está definido

### Aplicação não inicia
**Verificar logs e**:
1. Porta está sendo obtida de `process.env.PORT`
2. Não há erros de sintaxe no código
3. Dependências foram instaladas corretamente

## 💡 Dicas Importantes

1. **Sempre testar localmente** antes do deploy
2. **Usar variáveis de ambiente** para configurações sensíveis
3. **Manter package.json atualizado** com todas as dependências
4. **Criar scripts npm** para facilitar comandos
5. **Documentar configurações especiais** no README

## 🔐 Segurança

- Nunca commitar senhas ou chaves API
- Usar variáveis de ambiente para dados sensíveis
- Configurar HTTPS (EasyPanel faz automaticamente)
- Revisar permissões de arquivos

## 📝 Checklist de Deploy

- [ ] Código testado localmente
- [ ] package.json com todas as dependências
- [ ] Script "start" definido
- [ ] .gitignore configurado
- [ ] Arquivos desnecessários removidos
- [ ] ZIP criado sem pastas problemáticas
- [ ] Variáveis de ambiente configuradas
- [ ] Upload realizado com sucesso
- [ ] Build configurado (Nixpacks)
- [ ] Deploy executado
- [ ] Aplicação testada no URL final

## 🎯 Resultado Esperado

Após seguir este guia, você terá:
- Aplicação rodando em produção
- URL tipo: `https://nome-projeto.xxxxx.easypanel.host/`
- Logs e monitoramento disponíveis
- Facilidade para fazer atualizações

---

**Última atualização**: Agosto 2024
**Testado com**: EasyPanel v2.19.0, Node.js 16+

## 💾 Para Outros Projetos

Este guia é genérico e pode ser usado para qualquer projeto Node.js. Adapte conforme necessário para:
- Python/Django: Usar buildpack Python
- PHP: Usar buildpack PHP
- Static Sites: Servir com nginx
- Docker: Usar opção Dockerfile