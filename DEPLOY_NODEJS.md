# 🚀 GUIA DE DEPLOY - Torneio de Truco com Node.js

## REQUISITOS DO SERVIDOR
- VPS com Ubuntu/Debian
- Acesso SSH (root ou sudo)
- Portas 80 e 3000 liberadas

## PASSO 1: INSTALAR NODE.JS NO SERVIDOR

Conecte via SSH e execute:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

## PASSO 2: INSTALAR PM2 (Gerenciador de Processos)

```bash
# PM2 mantém o servidor rodando sempre
sudo npm install -g pm2
```

## PASSO 3: CRIAR PASTA DO PROJETO

```bash
# Criar pasta
mkdir -p /var/www/truco
cd /var/www/truco
```

## PASSO 4: FAZER UPLOAD DOS ARQUIVOS

Use um destes métodos:

### Opção A: Via Git (mais fácil)
```bash
# Se você subir para GitHub
git clone https://github.com/seu-usuario/truco.git .
```

### Opção B: Via SCP do seu computador
```bash
# No seu computador Windows (PowerShell)
scp -r C:\Users\rrzil\Documents\Projetos\Truco\* root@SEU_IP:/var/www/truco/
```

### Opção C: Via SFTP (FileZilla)
- Conecte com FileZilla usando seus dados SSH
- Arraste todos os arquivos para /var/www/truco/

## PASSO 5: INSTALAR DEPENDÊNCIAS

```bash
cd /var/www/truco
npm install
```

## PASSO 6: INICIAR SERVIDOR

```bash
# Iniciar com PM2
pm2 start server.js --name truco

# Ver logs
pm2 logs truco

# Salvar configuração para iniciar no boot
pm2 startup
pm2 save
```

## PASSO 7: CONFIGURAR NGINX (Opcional - Para usar porta 80)

```bash
# Instalar Nginx
sudo apt install nginx -y

# Criar configuração
sudo nano /etc/nginx/sites-available/truco
```

Cole isto:
```nginx
server {
    listen 80;
    server_name seu-dominio.com;  # ou use o IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/truco /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## PASSO 8: TESTAR

1. Acesse: http://SEU_IP:3000 (ou http://seu-dominio.com se configurou Nginx)
2. Abra em múltiplos dispositivos
3. Teste a sincronização em tempo real!

## COMANDOS ÚTEIS PM2

```bash
pm2 list          # Ver aplicações rodando
pm2 restart truco # Reiniciar
pm2 stop truco    # Parar
pm2 logs truco    # Ver logs
pm2 monit         # Monitor em tempo real
```

## ESTRUTURA DE ARQUIVOS NO SERVIDOR

```
/var/www/truco/
├── server.js         # Servidor Node.js (vou criar)
├── package.json      # Dependências (vou criar)
├── index.html        # Interface principal
├── js/
│   ├── app.js
│   ├── bracket.js
│   ├── db.js
│   ├── export.js
│   └── sync.js
└── README.md
```

## PROBLEMAS COMUNS

### Porta 3000 em uso
```bash
# Ver o que está usando a porta
sudo lsof -i :3000
# Matar processo
sudo kill -9 PID_DO_PROCESSO
```

### Permissões
```bash
# Dar permissão para a pasta
sudo chown -R $USER:$USER /var/www/truco
chmod -R 755 /var/www/truco
```

### Firewall bloqueando
```bash
# Liberar portas
sudo ufw allow 3000
sudo ufw allow 80
sudo ufw allow 443
```

---

## 🎯 RESULTADO FINAL

Após seguir estes passos, você terá:
- ✅ Servidor Node.js rodando 24/7
- ✅ Sincronização em tempo real via WebSocket
- ✅ Múltiplos dispositivos conectados simultaneamente
- ✅ Sistema resistente a quedas (PM2 reinicia automaticamente)

**Tempo estimado: 15-20 minutos**