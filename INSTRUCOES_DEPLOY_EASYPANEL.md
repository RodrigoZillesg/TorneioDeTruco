# 📋 INSTRUÇÕES DE DEPLOY NO EASYPANEL

## Você já tem:
✅ Projeto "truco" criado no EasyPanel
✅ Todos os arquivos prontos para deploy

## Passos para completar o deploy:

### 1. Na página de criar serviço (onde você está agora):
1. Procure por **"App"** ou **"Github"** 
2. Clique em **"App from Github"** ou **"Generic App"**

### 2. Configure o serviço:
- **Nome do serviço**: `truco-app`
- **Tipo**: Node.js Application

### 3. Método de Deploy:

#### Opção A: Via GitHub (Recomendado)
1. Faça upload dos arquivos para um repositório GitHub:
   - Crie um novo repositório em github.com
   - Faça upload de todos os arquivos da pasta Truco
   - Copie a URL do repositório

2. No EasyPanel:
   - Cole a URL do GitHub
   - Branch: main ou master
   - Build Command: `npm install`
   - Start Command: `npm start`

#### Opção B: Via Git direto
No seu computador, execute:
```bash
cd C:\Users\rrzil\Documents\Projetos\Truco
git init
git add .
git commit -m "Deploy inicial"
git remote add easypanel http://103.199.187.87:3000/git/truco.git
git push easypanel main
```

### 4. Variáveis de Ambiente:
- **PORT**: (deixar vazio, EasyPanel define automaticamente)
- **NODE_ENV**: production

### 5. Configurações:
- **Porta**: 3000 (ou deixar EasyPanel escolher)
- **Domínio**: Será gerado automaticamente
- **Health Check Path**: /api/status

### 6. Deploy:
1. Clique em **"Deploy"** ou **"Create Service"**
2. Aguarde o build (cerca de 2-3 minutos)
3. Quando ficar verde, clique no link do domínio gerado

## 🎯 Resultado Esperado:
- URL tipo: `http://truco-app.103.199.187.87.sslip.io`
- Sistema funcionando com sincronização em tempo real
- WebSocket conectado entre dispositivos

## 📱 Para testar:
1. Abra a URL em múltiplos dispositivos
2. Crie um torneio
3. Faça alterações em um dispositivo
4. Veja as mudanças aparecerem em tempo real nos outros!

## ⚠️ Se houver erro:
1. Verifique os logs no EasyPanel
2. Certifique-se que o `package.json` está correto
3. Verifique se a porta está configurada corretamente

---

**Arquivos necessários no deploy:**
- ✅ server.js
- ✅ package.json
- ✅ index.html
- ✅ pasta js/ com todos os arquivos
- ✅ REGRAS_PROJETO.md (documentação)