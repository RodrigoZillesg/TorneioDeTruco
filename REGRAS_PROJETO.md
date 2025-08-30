# REGRAS DO PROJETO - Sistema de Torneio de Truco

## IMPORTANTE
**Este documento deve ser consultado SEMPRE antes de fazer alterações no código para garantir que nenhuma regra importante seja sobrescrita ou ignorada.**

## 1. ARQUITETURA E TECNOLOGIAS

### Frontend
- **Vue 3** com Composition API
- **Tailwind CSS** para estilização
- **Reatividade**: Todas as variáveis de estado usam `ref()` e `reactive()`
- **Single Page Application** (SPA) com navegação por rotas

### Persistência
- **IndexedDB** com Dexie.js como primeira opção
- **localStorage** como fallback quando IndexedDB não está disponível
- **Backup automático** no localStorage para recuperação

### Estrutura de Arquivos
- `index.html` - Interface principal
- `js/app.js` - Lógica principal da aplicação
- `js/bracket.js` - Sistema de geração e gerenciamento de brackets
- `js/db.js` - Camada de persistência e modelos de dados
- `js/export.js` - Sistema de exportação e compartilhamento

## 2. REGRAS DE NEGÓCIO DO TRUCO

### Sistema de Pontuação
- **Tentos por mão**: Cada mão acumula tentos até 12 pontos
- **Vitória da mão**: Uma dupla vence a mão ao atingir exatamente 12 tentos
- **Máximo por clique**: +1 tento por clique (truco rápido +3 foi removido)
- **Display**: Mostra "X mãos vencidas" + "Y/12 tentos da mão atual"

### Sistema de Partidas
- **Melhor de X mãos**: Configurável (padrão: melhor de 3)
- **Vitória da partida**: Primeira dupla a vencer ceil(melhorDe/2) mãos
- **Status**: pendente → concluida
- **Edição de resultado**: Permitida após conclusão com confirmação

### Sistema de Torneios
- **Formato**: Eliminatória simples apenas
- **Bracket**: Potência de 2 com BYEs automáticos quando necessário
- **Randomização**: Fisher-Yates shuffle para sementeamento
- **Avanço automático**: BYEs são processados automaticamente
- **Status**: configuracao → andamento → concluido

## 3. REGRAS DE INTERFACE E UX

### Navegação
- **Rotas**: home, novo-torneio, duplas, bracket, partida, compartilhar
- **Estados**: Reativo com Vue 3, persistente entre sessões
- **Histórico**: Botão de voltar disponível em todas as telas exceto home

### Notificações (Toast)
- **Posição**: Canto superior direito (top-4 right-4)
- **Tipos**: 'sucesso' (verde) ou 'erro' (vermelho)
- **Persistência**: Configurações salvas no localStorage
- **Duração**: Auto-hide após alguns segundos

### Formulários
- **Nomes de dupla**: Opcionais, auto-gerados como "Jogador1 & Jogador2"
- **Validação**: Nomes obrigatórios, outros campos opcionais
- **Sugestões**: Histórico de jogadores com autocomplete
- **Campos obrigatórios**: Apenas nome do torneio e pelo menos 2 duplas

### Tela de Partida
- **Display duplo**: Cada dupla tem sua seção com mãos vencidas e tentos atuais
- **Botões**: "+1 Tento" para cada dupla
- **Histórico**: Mostra todas as mãos com status (vencida/em andamento)
- **Ações**: Desfazer última jogada, editar resultado finalizado

## 4. REGRAS DO SISTEMA DE BRACKET

### Geração
- **Algoritmo**: Potência de 2 para balanceamento
- **BYEs**: Calculados automaticamente (próxima_potencia - total_duplas)
- **Distribuição**: BYEs distribuídos aleatoriamente na primeira rodada
- **Avanço**: BYEs avançam automaticamente para próxima rodada

### Estrutura
- **Primeira rodada**: ceil(total_duplas / 2) partidas
- **Rodadas seguintes**: Baseadas em duplas que realmente avançam
- **Nomenclatura**: Primeira Rodada → Semifinal → Final (ou Quartas quando aplicável)
- **Integridade**: Sistema valida bracket antes de usar

### Partidas
- **Estados**: aguardando → pendente → concluida
- **Identificação**: IDs únicos, mesa numerada sequencialmente
- **Dependências**: Próxima rodada só libera quando duplas estão definidas

## 5. REGRAS DE PERSISTÊNCIA

### Modelos de Dados
```javascript
// Torneio
{
  id: string,
  nome: string,
  criadoEm: ISO string,
  status: 'configuracao' | 'andamento' | 'concluido',
  regras: {
    formato: 'eliminatoria_simples',
    melhorDe: number,
    pontosPorMao: 1,
    criterioDesempate: 'mao_extra'
  },
  duplas: Array<Dupla>,
  bracket: { rodadas: Array<Rodada> },
  campeao: string | null
}

// Dupla
{
  id: string,
  nome: string,
  jogadores: [string, string],
  avatarUrl: string,
  stats: {
    vitorias: number,
    derrotas: number,
    pontosPro: number,
    pontosContra: number
  }
}

// Partida
{
  id: string,
  round: number,
  mesa: number,
  duplaA: string | null,
  duplaB: string | null,
  maos: Array<{pontosA: number, pontosB: number}>,
  vencedor: string | null,
  status: 'aguardando' | 'pendente' | 'concluida',
  iniciada: ISO string | null,
  finalizada: ISO string | null
}
```

### Sincronização
- **Salvamento**: Automático após cada ação importante
- **Carregamento**: Lazy loading quando necessário
- **Backup**: Automático no localStorage, últimos 5 backups mantidos
- **Integridade**: Validação antes de salvar

## 6. REGRAS DE FUNCIONALIDADES REMOVIDAS

### Truco Rápido
- **Status**: REMOVIDO COMPLETAMENTE
- **Motivo**: Simplificação solicitada pelo usuário
- **Impacto**: Apenas +1 tento disponível por clique
- **Limpeza**: Removido de interface, lógica e persistência

### Importação de Torneios
- **Status**: REMOVIDO COMPLETAMENTE
- **Motivo**: Simplificação da interface inicial
- **Impacto**: Apenas criação local de torneios
- **Alternativa**: Funcionalidade existe em js/export.js mas não exposta na UI

## 7. REGRAS DE GERENCIAMENTO DE TORNEIOS

### Tela Inicial
- **Lista**: Ordenada por data de criação (mais recentes primeiro)
- **Ações**: Abrir, Reiniciar (zera bracket), Excluir (com confirmação)
- **Status**: "Em andamento" ou "Finalizado" baseado em status do torneio
- **Criação**: Apenas via formulário de novo torneio

### Compartilhamento
- **Exportação JSON**: Com metadados completos
- **Links**: URL com dados comprimidos (LZ-String quando disponível)
- **QR Code**: Geração automática para links
- **Modos**: Somente leitura ou colaborativo (preparado)

## 8. REGRAS DE VALIDAÇÃO

### Torneios
- Nome obrigatório e não vazio
- Mínimo 2 duplas para gerar bracket
- Melhor de X deve ser ímpar e >= 1

### Duplas
- Nome pode ser vazio (auto-gerado)
- Pelo menos um jogador deve ter nome
- IDs únicos gerados automaticamente

### Partidas
- Não podem iniciar sem ambas as duplas definidas
- Resultados podem ser editados após finalização
- Histórico de mãos mantido para auditoria

## 9. REGRAS DE COMUNICAÇÃO E IDIOMA

### Idioma
- **Padrão**: Português brasileiro em todo o sistema
- **Mensagens**: Toast, confirmações, labels em pt-BR
- **Código**: Comentários e logs em português quando possível

### Feedback ao Usuário
- **Confirmações**: Para ações destrutivas (excluir, reiniciar)
- **Notificações**: Para sucessos e erros
- **Estados**: Visuais claros para loading, vazio, erro

## 10. REGRAS TÉCNICAS

### Performance
- **Lazy loading**: Carregar dados sob demanda
- **Debounce**: Para busca e autocompletar
- **Batch operations**: Múltiplas alterações em uma transação

### Compatibilidade
- **Navegadores**: Modernos com suporte a ES6+
- **Dispositivos**: Responsivo, funciona em mobile
- **Fallbacks**: localStorage quando IndexedDB falha

### Segurança
- **Sanitização**: Nomes e textos sanitizados antes de salvar
- **Validação**: Client-side para UX, sempre validar dados
- **Backup**: Nunca perder dados do usuário

---

## PRÓXIMAS FUNCIONALIDADES PLANEJADAS
- **Sincronização em tempo real** entre múltiplos dispositivos
- **WebSocket** ou **Server-Sent Events** para updates
- **Estado compartilhado** em tempo real do torneio

---
**Última atualização**: 2025-08-29  
**Versão**: 1.0  
**Status**: Ativo - Consultar sempre antes de modificações