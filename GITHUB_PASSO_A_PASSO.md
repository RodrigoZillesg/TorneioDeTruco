# 🚀 GitHub + EasyPanel - Guia Visual Passo a Passo

## ✅ O que já fizemos:
1. ✅ Código preparado e commitado
2. ✅ Git configurado localmente

## 📝 O que você precisa fazer agora:

### 1️⃣ No GitHub (navegador):
Após criar o repositório, você verá uma página com comandos. 
Procure por algo assim:
```
…or push an existing repository from the command line

git remote add origin https://github.com/SEU-USUARIO/torneio-truco.git
git branch -M main
git push -u origin main
```

### 2️⃣ No Terminal (PowerShell/CMD):
**IMPORTANTE**: Substitua `SEU-USUARIO` pelo seu nome de usuário do GitHub!

```bash
# Adicionar o GitHub como destino (origin)
git remote add origin https://github.com/SEU-USUARIO/torneio-truco.git

# Renomear branch para main (padrão do GitHub)
git branch -M main

# Enviar código para o GitHub
git push -u origin main
```

### 🔐 Autenticação:
Quando executar o `git push`, pode aparecer:

**Opção A - Janela de Login:**
- Uma janela do navegador abrirá
- Faça login no GitHub
- Autorize o Git

**Opção B - Usuario e Senha:**
- Username: seu-usuario-github
- Password: Você precisa criar um **Personal Access Token**

### 🔑 Se pedir Personal Access Token:
1. Vá em: https://github.com/settings/tokens
2. Clique em "Generate new token (classic)"
3. Nome: "EasyPanel Deploy"
4. Marque: ✅ repo (todas as opções)
5. Clique "Generate token"
6. **COPIE O TOKEN** (só aparece uma vez!)
7. Use o token como senha no terminal

### 3️⃣ Verificar no GitHub:
Após o push, atualize a página do GitHub.
Você deve ver todos os arquivos do projeto!

### 4️⃣ No EasyPanel:

1. **Acesse**: http://103.199.187.87:3000/
2. **Vá em**: truco → torneio-de-truco → **Fonte**
3. **Selecione**: **GitHub**
4. **Preencha**:
   - **Proprietário**: SEU-USUARIO
   - **Repositório**: torneio-truco
   - **Ramo**: main
   - **Caminho de Build**: ./ (ou deixe vazio)
5. **Clique**: Salvar
6. **Clique**: Implantar

## ⚠️ Problemas Comuns:

### "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/torneio-truco.git
```

### "error: failed to push some refs"
```bash
git pull origin main --allow-unrelated-histories
git push origin main
```

### "Authentication failed"
- Crie um Personal Access Token (instruções acima)
- Use o token no lugar da senha

## 🎯 Resultado Esperado:
1. Código no GitHub ✅
2. EasyPanel conectado ao GitHub ✅
3. Deploy automático funcionando ✅
4. Sincronização entre dispositivos ✅

---

## 💡 Dica:
Depois de configurado, para futuras atualizações será simples:
```bash
git add .
git commit -m "Descrição da mudança"
git push
```
E o EasyPanel pode atualizar automaticamente!