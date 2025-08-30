# 📋 REGRA DE VERSIONAMENTO - OBRIGATÓRIO

## 🚨 REGRA FUNDAMENTAL:
**A CADA ALTERAÇÃO NO CÓDIGO, SEM EXCEÇÃO, DEVE-SE ATUALIZAR A VERSÃO!**

## 🎯 Localização da Versão:
Arquivo: `js/version.js`
```javascript
VERSION: '1.2.0',        // ← ATUALIZAR AQUI
BUILD_DATE: '2024-08-30', // ← DATA ATUAL
LAST_UPDATE: '08:30'      // ← HORA ATUAL
```

## 📊 Sistema de Versionamento:

### Formato: `MAJOR.MINOR.PATCH`

**MAJOR (X.0.0)**: Mudanças que quebram compatibilidade
- Exemplo: Mudança na estrutura do banco de dados
- Exemplo: Remoção de funcionalidades

**MINOR (1.X.0)**: Novas funcionalidades
- Exemplo: Nova tela ou recurso
- Exemplo: Melhorias significativas

**PATCH (1.1.X)**: Correções e pequenas melhorias
- Exemplo: Fix de bugs
- Exemplo: Ajustes de interface
- Exemplo: Otimizações de performance

## 🔄 Processo OBRIGATÓRIO para Qualquer Mudança:

### 1. Antes de fazer QUALQUER alteração:
```javascript
// Em js/version.js, atualizar:
VERSION: '1.X.X', // ← INCREMENTAR
BUILD_DATE: 'YYYY-MM-DD', // ← DATA DE HOJE
LAST_UPDATE: 'HH:MM' // ← HORA ATUAL
```

### 2. Adicionar ao changelog:
```javascript
CHANGES: {
  '1.X.X': 'Descrição do que foi alterado',
  // versões anteriores...
}
```

### 3. Depois de alterar o código:
```bash
git add .
git commit -m "v1.X.X: Descrição da mudança"
git push
```

## ✅ Exemplos de Incremento:

### Bug fix simples:
`1.2.0` → `1.2.1`
```javascript
VERSION: '1.2.1',
BUILD_DATE: '2024-08-30',
LAST_UPDATE: '14:45'
CHANGES: {
  '1.2.1': 'Correção: Tooltip não aparecia em mobile'
}
```

### Nova funcionalidade:
`1.2.1` → `1.3.0`
```javascript
VERSION: '1.3.0',
BUILD_DATE: '2024-08-30',
LAST_UPDATE: '16:20'
CHANGES: {
  '1.3.0': 'Adicionado: Sistema de estatísticas avançadas'
}
```

### Mudança estrutural:
`1.3.0` → `2.0.0`
```javascript
VERSION: '2.0.0',
BUILD_DATE: '2024-08-31',
LAST_UPDATE: '09:00'
CHANGES: {
  '2.0.0': 'Reestruturação: Nova arquitetura de dados'
}
```

## 🎯 Por que é Importante:

1. **Cache do navegador**: Versão evita cache desatualizado
2. **Debug**: Saber exatamente qual versão está rodando
3. **Rastreamento**: Identificar quando bugs foram introduzidos
4. **Deploy**: Confirmar que deploy foi bem-sucedido
5. **Suporte**: Facilitar identificação de problemas

## 🔍 Como Verificar a Versão:

### No navegador:
- **Visível no header**: próximo ao título
- **Console**: `window.AppVersion.getFullInfo()`
- **Página de diagnóstico**: `/diagnostico.html`

### No código:
- **Git log**: `git log --oneline`
- **Arquivo**: `js/version.js`

## 🚫 NUNCA ESQUECER:

- ❌ Fazer alteração sem atualizar versão
- ❌ Usar a mesma versão em commits diferentes
- ❌ Esquecer de atualizar data/hora
- ❌ Deploy sem incrementar versão

- ✅ Sempre incrementar antes de alterar código
- ✅ Usar mensagens de commit com versão
- ✅ Testar após cada mudança
- ✅ Verificar versão após deploy

## 📝 Template de Commit:
```
v1.X.X: Tipo - Descrição resumida

- Detalhe 1
- Detalhe 2
- Detalhe 3

Incrementa versão: 1.Y.Y → 1.X.X
```

## 🎯 Checklist Antes de Qualquer Mudança:

- [ ] Versão atualizada em `js/version.js`
- [ ] Data e hora atualizadas
- [ ] Changelog adicionado
- [ ] Commit com mensagem versionada
- [ ] Push para GitHub
- [ ] Deploy no EasyPanel
- [ ] Verificação da versão em produção

---

**ESTA REGRA É OBRIGATÓRIA E DEVE SER SEGUIDA SEMPRE!**

**Versão atual**: 1.2.0
**Próxima versão**: 1.2.1 (correções) ou 1.3.0 (novas features)