# PRD – Sistema de Torneio de Truco (web estático: HTML + CSS + JS)

> **Resumo rápido**: Aplicação web **mobile‑first** (PWA opcional), hospedada como **arquivos estáticos** (HTML, CSS, JS). Persistência local (IndexedDB/LocalStorage), exportação/importação de JSON e compartilhamento via link/QR. Sem servidor obrigatório. Bibliotecas via **CDN** (Tailwind, Vue 3, Dexie, SortableJS, FileSaver, QRCode, Day.js). Foco total em UX simples para o **organizador**.

---

## 1) Visão Geral

O sistema gerencia torneios de **truco** com cadastro de **duplas**, **sorteio** de confrontos, **pontuação** de partidas e **avanço automático** até o campeão. Deverá operar **offline** (quando possível) e ser simples de usar em **smartphones**.

---

## 2) Objetivos do Produto

* Tornar o controle do torneio **rápido e livre de erros** (do cadastro ao campeão).
* Garantir **excelente UX no mobile** (toques grandes, poucas etapas, feedback claro).
* Permitir **regras configuráveis** (pontos por mão/partida, melhor de X, etc.).
* Não exigir backend: **rodar apenas no navegador**; opcional: sincronização com BaaS.

---

## 3) Público‑alvo

* **Organizador** do torneio (principal operador da interface).
* Jogadores/espectadores que podem visualizar o **bracket** e resultados em tela compartilhada ou link público.

---

## 4) Escopo Funcional

### 4.1. MVP (Obrigatório)

1. **Cadastro de duplas**

   * Campos: Nome da dupla (obrigatório), Jogador A/B (opcional), Avatar (opcional).
   * Ações: criar, editar, remover, reordenar.

2. **Configuração do torneio**

   * Formato: **Eliminatória simples** (MVP).
   * Regras:

     * **Pontos para vencer a partida** (ex.: 12 por mão, 1/3/5 mãos por partida – configurável).
     * **Melhor de X mãos** (ex.: melhor de 1, 3) – define número de mãos por partida.
     * **Critério de desempate** simples (ex.: mão extra rápida ou regra padrão escolhida).
   * **Sementeamento**: sorteio aleatório com opção de **ajuste manual** (drag & drop).

3. **Sorteio e chaveamento (bracket)**

   * Geração automática do **bracket** com **byes** se nº ímpar.
   * Visualização em colunas (rodadas) com destaque das **próximas partidas**.

4. **Registro de partidas**

   * Tela de **pontuação rápida** (botões grandes, +1, +3, desfazer, confirmar mão).
   * Indicar **vencedor da mão** e **da partida** com feedback visual e sonoro (opcional).
   * Histórico da partida (mãos e pontos).

5. **Avanço automático**

   * Vencedor **avança** para a próxima rodada.
   * Atualização **em tempo real** do bracket.

6. **Campeão**

   * Tela de **destaque** com nome/avatar da dupla campeã e opção de **compartilhar**.

7. **Persistência local & compartilhamento**

   * Persistir tudo em **IndexedDB** (fallback LocalStorage).
   * **Exportar/Importar** JSON (backup/restauração).
   * **Link/QR** público: estado serializado (ou somente‑leitura) via URL/hash (com limite de tamanho) ou arquivo JSON.

### 4.2. V2 (Importante)

* **Histórico de torneios** com busca/duplicação.
* **Relatórios simples**: partidas jogadas, vitórias/derrotas, pontos por dupla.
* **Tela pública somente‑leitura** (modo telão) com auto‑refresh do bracket (se houver sync).

### 4.3. V3 (Avançado)

* **Eliminatória dupla** (losers bracket) e/ou **grupos + mata‑mata**.
* **Sincronização opcional** com BaaS (ex.: Supabase/Firebase) via REST/SDK sem servidor próprio.
* **Estatísticas por jogador** (se cadastrados individualmente).
* Integrações (WhatsApp/Telegram) para envio de resultados.
* **Temas** (skin) e branding customizáveis.

---

## 5) Regras & Configurações (Truco)

> As regras variam por região. O sistema deve ser **flexível** e documentar o padrão do torneio criado.

* **Pontos por mão**: padrão 1, com possibilidade de “truco/ret trucos” (configurável como +3/+6/+9/+12 opcional ou registro rápido de +3).
* **Partida**: melhor de X **mãos** (ex.: 1 ou 3) – vencer X mãos decide a partida.
* **Tempo limite por mão** (opcional): aviso visual.
* **W\.O.**: marcar ausência e avançar o oponente automaticamente.
* **Empates/Interrupções**: permitir **pausar** e **retomar** a qualquer momento.

---

## 6) UX/UI (princípios e telas)

**Princípios**

* **Mobile‑first**: botões grandes, navegação por **tabs** fixas no rodapé.
* **Zero confusão**: foco em 3 ações principais por etapa (Cadastrar → Sortear → Marcar pontos).
* **Acessibilidade**: contraste AA, áreas de toque > 44px, suporte a teclado.
* **Feedback**: toasts/sinais visuais e (opcional) som curto ao salvar/avançar.

**Arquitetura de Informação / Navegação**

* **Home** (lista de torneios + botão “Novo Torneio”).
* **Assistente (wizard) de novo torneio**: Configurações → Duplas → Sorteio → Bracket.
* **Duplas**: CRUD, importação (CSV/colar linhas), reordenação (drag & drop).
* **Bracket**: visão geral; abrir **Partida** em modal/rota.
* **Partida**: pontuação rápida (mãos), desfazer última ação, confirmar resultado.
* **Compartilhar**: link/QR, exportar JSON, importar JSON.
* **Histórico** (V2+): lista com filtros; abrir/duplicar/arquivar.

**Wireflow textual (MVP)**

1. **Home** → “Novo Torneio”.
2. **Configuração** → setar regras → avançar.
3. **Duplas** → cadastrar/colar lista → avançar.
4. **Sorteio** → ver chave → ajustar posições (drag & drop) → confirmar.
5. **Bracket** → tocar numa **Partida** → **Pontuação** (mãos) → salvar → volta ao bracket.
6. Repetir até final → **Tela Campeão** → compartilhar/exportar.

---

## 7) Requisitos Técnicos (web estático)

* **Hospedagem**: qualquer serviço de arquivos estáticos (GitHub Pages, Netlify, Vercel estático, S3/CloudFront, etc.).
* **Framework UI**: **Vue 3 via CDN** (reatividade leve sem build) ou **Vanilla JS** (decisão de implementação).
* **Estilo**: **Tailwind CSS via CDN** (mobile‑first).
* **Estado/Persistência**: **IndexedDB** via **Dexie** (fallback LocalStorage).
* **Drag & drop**: **SortableJS** (ajuste manual de seeds/ordens).
* **Export/Import**: **FileSaver.js** (download), leitor de arquivo (upload JSON).
* **QR/Link**: **qrcodejs** para gerar QR; serialização compacta (compressão opcional com LZ‑String – CDN).
* **Datas**: **Day.js** (leve).
* **PWA (opcional)**: manifest.json + service worker (cache estático + dados locais).
* **Roteamento**: simples via hash (`#/home`, `#/bracket`, etc.) ou SPA com Vue sem router formal.

### 7.1. CDNs sugeridos (exemplos)

> Versões podem ser fixadas conforme necessidade de estabilidade.

```html
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Vue 3 (produção) -->
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>

<!-- Dexie (IndexedDB) -->
<script src="https://unpkg.com/dexie@latest/dist/dexie.min.js"></script>

<!-- SortableJS -->
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>

<!-- FileSaver -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>

<!-- QRCode -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

<!-- Day.js -->
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>

<!-- (Opcional) LZ-String para compactação -->
<script src="https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js"></script>
```

### 7.2. Estrutura de pastas (sugestão)

```
/ (raiz)
  index.html
  /assets
    /icons
    /images
  /js
    app.js
    db.js
    bracket.js
    scoring.js
    export.js
    router.js (se usar)
  /css
    styles.css (opcional, além do Tailwind)
  manifest.json (PWA opcional)
  sw.js (PWA opcional)
```

---

## 8) Modelo de Dados (JSON)

**Dupla**

```json
{
  "id": "team_001",
  "nome": "Os Valentes",
  "jogadores": ["Ana", "Bruno"],
  "avatarUrl": "",
  "stats": {"vitorias": 0, "derrotas": 0, "pontosPro": 0, "pontosContra": 0}
}
```

**Partida (match)**

```json
{
  "id": "match_010",
  "round": 1,
  "mesa": 3,
  "duplaA": "team_001",
  "duplaB": "team_007",
  "mãos": [
    {"ordem": 1, "pontosA": 0, "pontosB": 1},
    {"ordem": 2, "pontosA": 3, "pontosB": 0}
  ],
  "vencedor": "team_001",
  "status": "concluida"  
}
```

**Torneio**

```json
{
  "id": "tourn_001",
  "nome": "Truco da Firma 2025",
  "criadoEm": "2025-08-29T12:00:00-03:00",
  "regras": {
    "formato": "eliminatoria_simples",
    "melhorDe": 3,
    "pontosPorMao": 1,
    "permitirTrucoRapido": true,
    "criterioDesempate": "mao_extra"
  },
  "duplas": [/* array de Dupla */],
  "bracket": {
    "rodadas": [
      {"indice": 1, "matches": [/* Partidas round 1 */]},
      {"indice": 2, "matches": []}
    ]
  },
  "campeao": null,
  "status": "em_andamento"
}
```

---

## 9) Lógica de Geração de Bracket (MVP – Eliminatória Simples)

**Regras**

* Se número de duplas **não for potência de 2**, inserir **byes** (duplas avançam automaticamente).
* Sementeamento: **aleatório** (com opção de reordenar manualmente antes de fixar o round 1).

**Pseudocódigo**

```text
fun gerarBracket(duplas):
  embaralhar(duplas)
  n = próximaPotenciaDe2(duplas.length)
  byes = n - duplas.length
  listaRound1 = []
  cursor = 0
  enquanto cursor < duplas.length:
    if byes > 0:
      listaRound1.push(partida(dupla=duplas[cursor], bye=true))
      byes--
      cursor++
    else:
      listaRound1.push(partida(duplas[cursor], duplas[cursor+1]))
      cursor += 2
  montarRodadasAteFinal(listaRound1)
```

**Avanço**

* Ao concluir uma partida, setar `vencedor` e **preencher o slot** correspondente na partida da próxima rodada.
* Atualizar **stats** da dupla vencedora/derrotada.

---

## 10) Pontuação & UX de Partida

* **Controles grandes**: +1, +3 (truco rápido), **Desfazer** última mão, **Confirmar Mão**.
* **Indicadores**: contador de mãos vencidas por dupla; destaque para quem está a 1 mão da vitória.
* **Erros evitados**: confirmação de resultado antes de salvar; popup “tem certeza?”.
* **Pausa/Retomar**: guardar estado parcial da partida.

---

## 11) Persistência & Compartilhamento

* **IndexedDB (Dexie)**: tabelas `torneios`, `duplas`, `matches` (ou tudo aninhado em `torneios`).
* **Snapshots**: criar snapshot do torneio a cada ação relevante (para **desfazer** e histórico).
* **Exportar/Importar**: JSON único do torneio (com validação de versão do schema).
* **Link/QR**: gerar **link somente‑leitura** via serialização compacta no hash (limitação de tamanho – usar LZ‑String se preciso). Para estados grandes, recomendar compartilhamento do arquivo JSON.

---

## 12) Requisitos Não Funcionais

* **Performance**: TTI < 1s em dispositivos medianos; interações < 100ms.
* **Acessibilidade**: WCAG 2.1 AA (teclado, contraste, rótulos, aria‑live nos toasts).
* **Compatibilidade**: últimos 2 anos de Chrome/Edge/Safari/Firefox mobile & desktop.
* **Offline‑first** (se PWA ativado).
* **Privacidade**: dados ficam no dispositivo; sem rastreamento por padrão.

---

## 13) Testes & Aceitação (MVP)

**Cenários principais**

* Criar torneio com 8, 9, 16 duplas (verificar byes).
* Reordenar duplas antes do sorteio (drag & drop) e fixar bracket.
* Registrar uma partida completa (melhor de 3) com mãos +1/+3 e **desfazer**.
* Avançar rounds sucessivos até **campeão** ser declarado.
* Exportar JSON, limpar storage, **importar** JSON e retomar o torneio.
* Gerar **QR** e abrir link somente‑leitura em outro dispositivo.

**Critérios de aceite**

* Fluxo completo (Configurar → Duplas → Sorteio → Bracket → Campeão) sem travas.
* Bracket correto com byes, sem partidas “órfãs”.
* UX utilizável com **uma mão** no celular (thumb‑reach).

---

## 14) Roadmap & Entregas

* **Sprint 1 (MVP UI/Fluxo)**: IA, telas, CRUD duplas, sorteio, bracket estático.
* **Sprint 2 (Pontuação/Estado)**: partida/mãos, avanço automático, snapshots/undo.
* **Sprint 3 (Persistência/Share)**: IndexedDB (Dexie), export/import, QR/link‑view.
* **Sprint 4 (Polimento)**: A11y, feedbacks, microanimações, testes e docs.
* **V2**: histórico de torneios, relatórios, modo telão.
* **V3**: formatos avançados, sync BaaS, estatísticas.

---

## 15) Riscos & Mitigações

* **Variação de regras de truco** → oferecer presets + campos avançados.
* **Limite de URL** ao compartilhar → usar arquivo JSON quando necessário.
* **Aprendizado do operador** → wizard enxuto, tooltips e checklist de etapa.

---

## 16) Perguntas em Aberto (para decidir na implementação)

* Padrão de regras: **Paulista**? **Mineiro**? (definir preset inicial e permitir ajustes).
* Quantas **mãos** por partida no padrão do MVP (sugerido: **melhor de 3**)?
* Necessidade de **sincronização multi‑dispositivo** (se sim, V3 com BaaS).

---

## 17) Anexo – Exemplo de esqueleto `index.html`

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Torneio de Truco</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { theme: { extend: { colors: { brand: { DEFAULT: '#0ea5e9' }}}}};</script>
  <link rel="manifest" href="manifest.json" />
</head>
<body class="bg-slate-50 text-slate-900">
  <div id="app" class="min-h-dvh flex flex-col">
    <!-- Header -->
    <header class="px-4 py-3 border-b bg-white sticky top-0 z-10">
      <h1 class="text-xl font-bold">Torneio de Truco</h1>
    </header>

    <!-- Conteúdo -->
    <main class="flex-1 p-4">
      <!-- Montar componentes via Vue -->
      <home-view v-if="route==='home'" />
      <wizard-view v-else-if="route==='wizard'" />
      <teams-view v-else-if="route==='teams'" />
      <bracket-view v-else-if="route==='bracket'" />
      <match-view v-else-if="route==='match'" />
    </main>

    <!-- Tab bar -->
    <nav class="bg-white border-t sticky bottom-0">
      <ul class="grid grid-cols-4 text-center">
        <li class="p-2" @click="go('home')">Home</li>
        <li class="p-2" @click="go('wizard')">Novo</li>
        <li class="p-2" @click="go('teams')">Duplas</li>
        <li class="p-2" @click="go('bracket')">Bracket</li>
      </ul>
    </nav>
  </div>

  <!-- Libs -->
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <script src="https://unpkg.com/dexie@latest/dist/dexie.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js"></script>

  <!-- App scripts -->
  <script src="/js/app.js"></script>
</body>
</html>
```

---

## 18) Definição de Pronto (DoD – MVP)

* Fluxo completo do torneio funcional no mobile.
* Bracket correto, com avanço automático e tela de campeão.
* Persistência local + exportar/importar JSON.
* Guia de uso curto (1 página) embutido (help modal) e checklist do wizard.
* Testes manuais dos cenários de aceitação concluídos.
