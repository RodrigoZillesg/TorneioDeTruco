# 🔄 Instruções para Atualizar o Sistema no EasyPanel

## Opção 1: Via Console do EasyPanel (Recomendado)

1. **Acesse o EasyPanel**: http://103.199.187.87:3000/
2. **Navegue para**: Projetos → truco → torneio-de-truco
3. **Clique em "Console"** (ícone de terminal)
4. **Execute os comandos abaixo** no console:

```bash
# Navegar para pasta do código
cd /etc/easypanel/projects/truco/torneio-de-truco/code

# Criar backup do código atual
cp -r . ../backup-$(date +%Y%m%d-%H%M%S)

# Atualizar arquivos principais
cat > js/persistence.js << 'EOF'
[Cole o conteúdo do arquivo js/persistence.js aqui]
EOF

# Atualizar index.html (apenas a parte do header)
# Use o editor nano ou vi para editar manualmente
nano index.html
# Adicione o indicador de status no header conforme instruções

# Reiniciar o serviço
pm2 restart all
```

## Opção 2: Via Git (Se configurado)

```bash
# No seu computador local
git add .
git commit -m "Update: Sistema de sincronização"
git remote add easypanel http://103.199.187.87:3000/git/truco.git
git push easypanel master
```

## Opção 3: Upload Manual de Arquivos

Como o upload de ZIP está falhando, você pode:

1. **Acessar o Console do EasyPanel**
2. **Criar os arquivos manualmente**:

### Criar o arquivo persistence.js:
```bash
cat > /etc/easypanel/projects/truco/torneio-de-truco/code/js/persistence.js << 'ENDFILE'
# Cole aqui o conteúdo completo do persistence.js
ENDFILE
```

### Atualizar o index.html:
```bash
# Faça backup primeiro
cp index.html index.html.bak

# Edite o arquivo
nano index.html
```

Adicione após a linha 1072:
```html
<script src="js/persistence.js"></script>
```

E atualize o header (linha 30-37) para incluir o indicador de status.

### Criar diagnostico.html:
```bash
cat > /etc/easypanel/projects/truco/torneio-de-truco/code/diagnostico.html << 'ENDFILE'
# Cole aqui o conteúdo do diagnostico.html
ENDFILE
```

## Opção 4: Destruir e Recriar o Serviço

Se nada funcionar:

1. **Faça backup** dos dados importantes
2. **Destrua o serviço** atual
3. **Crie um novo serviço**
4. **Use o novo ZIP** para fazer o deploy inicial

## Arquivos que Precisam ser Atualizados:

1. ✅ **js/persistence.js** (NOVO)
2. ✅ **index.html** (linha 1073 e header)
3. ✅ **js/app.js** (funções de salvamento)
4. ✅ **js/sync.js** (verificação de Socket.IO)
5. ✅ **diagnostico.html** (NOVO - opcional mas útil)

## Verificação Após Deploy:

1. Acesse: https://truco-torneio-de-truco.qczjfz.easypanel.host/
2. Abra o Console do navegador (F12)
3. Deve aparecer: "Sistema de Persistência Universal carregado"
4. Crie um torneio no computador
5. Abra no celular - deve carregar automaticamente
6. Teste em: /diagnostico.html para verificar status

## Problema com Upload de ZIP?

O EasyPanel pode estar rejeitando o ZIP porque:
- O serviço já está rodando (precisa parar primeiro)
- Limitação de tamanho
- Formato não reconhecido para atualização

**Solução**: Use o Console do EasyPanel para atualizar os arquivos diretamente.