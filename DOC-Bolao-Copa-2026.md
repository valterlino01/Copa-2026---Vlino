# Bolão Copa 2026 — Documentação do Projeto

Documento de contexto para retomar/continuar o desenvolvimento do app de bolão da Copa do Mundo 2026.

## Visão geral

App web single-file (React via Babel standalone, sem build) hospedado no GitHub Pages, com persistência em Firebase Firestore.

- **Repositório:** github.com/valterlino01/Copa-2026---Vlino
- **App ao vivo:** valterlino01.github.io/Copa-2026---Vlino/
- **Arquivo único:** `index.html` (~1358 linhas) — contém todo o React, estilos e lógica
- **Firebase projeto:** copa2026-vlino
- **Stack:** React 18 UMD + Babel standalone + Firebase 10.7.1 compat (firestore). Fonte Barlow Condensed. Tema escuro (fundo gradiente #0a0f1e → #0d1b2a → #071a0d), acento dourado #ffd700.

## Formato da Copa 2026

48 seleções, 12 grupos (A–L), 4 por grupo. Classificam os 2 primeiros de cada grupo (24) + os 8 melhores terceiros = 32 → 16avos de final → Oitavas → Quartas → Semifinais → Disputa de 3º lugar → Final.

No código, a fase de 16avos é rotulada como `"2ª Fase"` (legado). As fases no campo `phase` são: `"Grupos"`, `"2ª Fase"`, `"Oitavas"`, `"Quartas"`, `"Semifinal"`, `"3º Lugar"`, `"Final"`.

## Chaveamento oficial dos 16avos (16 chaves)

Mapeamento confirmado contra a fonte oficial (Wikipedia "2026 FIFA World Cup knockout stage" / Regulamento FIFA). As imagens iniciais do GE estavam erradas — ver changelog v5.

```
Chave 1 (jogo 73): 2ºA × 2ºB       Chave 9  (jogo 81): 1ºD × Melhor 3º
Chave 2 (jogo 74): 1ºE × Melhor 3º Chave 10 (jogo 82): 1ºG × Melhor 3º
Chave 3 (jogo 75): 1ºF × 2ºC       Chave 11 (jogo 83): 2ºK × 2ºL
Chave 4 (jogo 76): 1ºC × 2ºF       Chave 12 (jogo 84): 1ºH × 2ºJ
Chave 5 (jogo 77): 1ºI × Melhor 3º Chave 13 (jogo 85): 1ºB × Melhor 3º
Chave 6 (jogo 78): 2ºE × 2ºI       Chave 14 (jogo 86): 1ºJ × 2ºH
Chave 7 (jogo 79): 1ºA × Melhor 3º Chave 15 (jogo 87): 1ºK × Melhor 3º
Chave 8 (jogo 80): 1ºL × Melhor 3º Chave 16 (jogo 88): 2ºD × 2ºG
```

Oitavas (oficial FIFA): A=W74×W77 · B=W73×W75 · C=W76×W78 · D=W79×W80 · E=W83×W84 · F=W81×W82 · G=W86×W88 · H=W85×W87.
Quartas: Q1=W89×W90 · Q2=W93×W94 · Q3=W91×W92 · Q4=W95×W96.
Semis: SF1(Q1×Q2) SF2(Q3×Q4). 3º lugar: perdedores das semis. Final: vencedores das semis.

## Estrutura de dados (SCHEDULE)

Cada jogo de mata-mata carrega `homeSlot`/`awaySlot` — referências estruturadas que permitem propagação automática:

- `{t:"group", pos:1|2, g:"A"}` — posição num grupo
- `{t:"third"}` — melhor terceiro (precisa de escolha manual do admin)
- `{t:"winner", of:73}` — vencedor de outro jogo
- `{t:"loser", of:101}` — perdedor de outro jogo

A função `resolveSlot` resolve recursivamente cada slot para `{team, flag, certain}` ou `null` (quando indefinido → vira amarelo na UI).

## Regras de pontuação do bolão

### Pontos base do placar (função `calcScore`)
- Placar exato: 5
- Vencedor + 1 placar certo: 3
- Só o vencedor: 2
- 1 placar certo (sem acertar vencedor): 1
- Empate exato: 5
- Só acertou que foi empate: 3

### Pesos por fase (função `scoreMatch`, constante `PHASE_WEIGHT`)
Multiplicam os pontos base do placar:
- Grupos: 1×
- 16avos (2ª Fase): 1×
- Oitavas: 1,5×
- Quartas: 2×
- Semifinal: 3×
- 3º lugar: 2×
- Final: 4×

### Bônus de avanço (mata-mata)
+2 pontos (constante `ADVANCE_BONUS`) se acertar quem avança. No empate do tempo normal, o palpite inclui o campo `advance` ("home"/"away") indicando quem venceu nos pênaltis.

Exemplos validados:
- Quartas, placar exato: 5 × 2 = 10 pts
- Final, empate exato + acertou avanço: 5 × 4 + 2 = 22 pts
- Oitavas, placar errado mas acertou quem avança: 0 + 2 = 2 pts

## Classificação dos grupos

Função `computeGroupTable(grupo, results)` monta a tabela ao vivo. Ordena por: Pontos → Saldo de gols → Gols pró. Vitória 3pts, empate 1pt, derrota 0.

Quando há empate nesses 3 critérios automáticos, marca `tieFlag: true` (exibido com ⚠ amarelo). Os critérios oficiais restantes (confronto direto, fair play, ranking FIFA) NÃO são calculados automaticamente — o admin resolve manualmente via setas ↑↓ no painel, salvando em `manualOrder`.

`computeThirdsRanking` rankeia os 12 terceiros (mesmos critérios); os 8 primeiros classificam.

## Decisão de design: melhor terceiro

Em vez de implementar a tabela de combinações da FIFA (propensa a erro), o sistema:
1. Rankeia automaticamente os 12 terceiros e sugere os 8 melhores.
2. Deixa os slots `{t:"third"}` das chaves 3,4,5,6,9,12,13,14 em **amarelo**.
3. O admin escolhe/confirma a seleção de cada vaga (salvo em `manualThirds[matchId]`).

## Regra do mata-mata (futebol)

A partir dos 16avos não há empate: 90min → prorrogação (2×15min) → pênaltis. O vencedor avança. No app, isso é capturado pelo campo `advance` no resultado oficial e no palpite.

## Persistência (Firestore)

Coleções:
- `bets/{apelido}` — palpites de cada usuário. Cada chave é o matchId → `{homeScore, awayScore, advance?, at}`
- `results/official` — resultados oficiais. matchId → `{homeScore, awayScore, status, advance?, updatedAt}`
- `config/knockout` — `{manualOrder: {group_A: [...nomes]}, manualThirds: {matchId: "Nome"}}`

### Regras de segurança necessárias
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /results/official { allow read: if true; allow write: if true; }
    match /bets/{userId}    { allow read: if true; allow write: if true; }
    match /config/{doc}     { allow read: if true; allow write: if true; }
  }
}
```
(Adequadas para bolão informal — sem Firebase Auth, login só por apelido.)

## Componentes principais (index.html)

- `LoginScreen` — login por apelido (salvo em localStorage)
- `App` — estado global, listeners do Firestore, navegação por abas
- `BolaoTab` (🎯) — palpites dos jogos, filtros próximos/todos/encerrados
- `ClassificacaoTab` (📊) — 12 tabelas de grupo ao vivo + ranking de terceiros
- `ChaveamentoTab` (🗝️) — mata-mata com propagação automática + palpites; `KnockoutMatch` é o card individual
- `RankingTab` (🏆) — leaderboard com pontuação ponderada + detalhe por jogador + box de regras
- `TabelaTab` (📋) — tabela geral com busca/filtros + botão de atualizar resultados via API
- `AdminPanel` (👑) — 3 seções: Resultados (com seletor de pênaltis), Melhor 3º, Desempate de grupos

## Configurações pendentes / chaves

- `FIREBASE_CONFIG` — preenchido (projeto copa2026-vlino)
- `ANTHROPIC_API_KEY` — placeholder `COLE_SUA_ANTHROPIC_API_KEY_AQUI`; necessário só para o botão de busca automática de resultados via API (web_search). O resto do app funciona sem.
- `ADMIN_PASSWORD` — "copa2026admin" (em texto plano no cliente; segurança apenas simbólica)

## Pipeline de edição usado

Como o arquivo tem CRLF e é grande, as edições foram feitas via scripts Node (normalizando para LF), com validação de sintaxe JSX por `@babel/standalone` e testes funcionais das funções puras de lógica antes de cada commit.

## Próximas melhorias possíveis (não implementadas)

- Implementar a tabela oficial de combinações dos melhores terceiros (automática).
- Confronto direto e fair play automáticos no desempate de grupos.
- Cloud Function para proteger a Anthropic API key (hoje exporia no frontend).
- Firebase Auth para amarrar palpites a identidades reais.
- Visualização gráfica do bracket (árvore) em vez de lista por fase.

## Como rodar localmente

O app é single-file, mas **não basta abrir o index.html com duplo clique** — os scripts do React/Babel e as chamadas ao Firebase exigem um contexto servido por HTTP (`file://` quebra CORS e o service worker). Use um servidor estático local:

**Opção 1 — Python (já vem no Windows se instalado):**
```bash
cd "C:\Users\valter.lino\Copa-2026---Vlino"
python -m http.server 8000
```
Acesse `http://localhost:8000` no navegador.

**Opção 2 — Node (npx, sem instalar nada global):**
```bash
cd "C:\Users\valter.lino\Copa-2026---Vlino"
npx serve .
```

**Opção 3 — VS Code:** extensão "Live Server" → botão direito no `index.html` → "Open with Live Server".

Observações:
- O Firebase funciona em `localhost` normalmente (o domínio está autorizado por padrão). Palpites e resultados salvos localmente vão para o mesmo banco de produção (copa2026-vlino) — cuidado ao testar com dados reais.
- O botão "Atualizar resultados" (API Anthropic) só funciona com `ANTHROPIC_API_KEY` preenchida.
- Para publicar: `git add index.html && git commit -m "..." && git push`. O GitHub Pages recompila em ~1 min.

### Validar a sintaxe antes de publicar
Como o JSX roda via Babel no navegador, um erro de sintaxe só aparece em runtime (tela branca). Para checar antes:
```bash
npm install @babel/standalone --no-save
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const code=h.match(/<script type=.text\/babel.[^>]*>([\s\S]*?)<\/script>/)[1];require('@babel/standalone').transform(code,{presets:['react']});console.log('SINTAXE OK');"
```

## Changelog

### v3 — 2026-06-23 (commit 4910d2b)
Pós-fase de grupos completo.
- Reconstrução do chaveamento dos 16avos com o mapeamento oficial 2026 (o original estava com pares errados, ex: jogo 73 era "2ºA × 2ºB" em vez de "1ºA × 2ºB").
- Nova aba **Classificação**: 12 tabelas de grupo ao vivo (Pts → Saldo → Gols pró) + ranking dos 12 terceiros com os 8 classificados destacados. Empates não resolvíveis automaticamente marcados com ⚠.
- Nova aba **Chaveamento**: bracket das 16 chaves até a final, com propagação automática (vencedor de um jogo preenche o próximo). Slots de "Melhor 3º" em amarelo até escolha manual.
- Pesos por fase na pontuação (Oitavas 1,5× · Quartas 2× · Semi 3× · 3º 2× · Final 4×).
- Bônus de +2 por acertar quem avança no mata-mata; seletor de pênaltis em empates.
- Painel Admin reorganizado em 3 seções: Resultados (com pênaltis), Melhor 3º, Desempate de grupos.
- Box de regras reescrito explicando pesos e bônus.
- Coleção `config/knockout` no Firestore para `manualOrder` e `manualThirds`.

### v2 — 2026-06-23 (commit 95ae359)
Correções de bugs e configuração.
- Preenchimento das credenciais reais do Firebase (projeto copa2026-vlino).
- Adição do header `x-api-key` e `anthropic-version` na chamada à API Anthropic.
- Correção de 9 bandeiras erradas no SCHEDULE (Bósnia 🇮🇹→🇧🇦, Suécia 🇵🇱→🇸🇪, Iraque 🇧🇴→🇮🇶).
- Remoção de `db` do array de dependências de um `useEffect` (warning React).
- Eliminação de listener duplicado de `allBets` no Firestore.

### v1 — anterior
Versão base: login por apelido, palpites da fase de grupos, ranking, tabela geral, painel admin, integração Firebase + API Anthropic para busca de resultados. Estrutura de mata-mata presente mas com chaveamento incorreto e sem classificação/propagação.

### v4 — 2026-06-27 (correções pós-teste em produção)
- **Bug aba Bolão (mata-mata sem times):** o `BolaoTab`/`MatchBet` mostrava os nomes estáticos dos slots ("1º A") nos jogos de mata-mata. Agora resolve os slots via `resolveKnockoutMatch` (recebe `manualOrder`/`manualThirds`), exibe o time real quando definido, mostra em amarelo/itálico quando ainda pendente, e inclui o seletor de "quem avança" em empates — igual à aba Chave.
- **Bug Marrocos duplicado:** o slot "2º C" aparecia em duas chaves (7 e 11) e o "2º K" não aparecia em nenhuma — erro herdado das imagens-fonte (ambas escritas como "2º C"). Corrigido para Chave 11 = `1ºF × 2ºK`, única correção que torna o bracket matematicamente válido (todos os 12 segundos colocados aparecem exatamente 1×). ATENÇÃO: a escolha de qual chave (7 ou 11) recebe o 2ºK é dedução por consistência, não confirmação da FIFA — convém validar o pareamento oficial. Se a fonte indicar o contrário, basta trocar os grupos das chaves 7 e 11.

### v5 — 2026-06-27 (chaveamento oficial FIFA)
**Correção crítica.** Descoberto via fonte oficial (Wikipedia "2026 FIFA World Cup knockout stage" / Regulamento FIFA) que o chaveamento dos 16avos transcrito das imagens do GE estava majoritariamente errado — não era só a duplicata do Marrocos. Reconstruídos os jogos 73–104 com o mapeamento oficial:

```
Ch1 (73): 2ºA × 2ºB        Ch9  (81): 1ºD × Melhor 3º
Ch2 (74): 1ºE × Melhor 3º  Ch10 (82): 1ºG × Melhor 3º
Ch3 (75): 1ºF × 2ºC        Ch11 (83): 2ºK × 2ºL
Ch4 (76): 1ºC × 2ºF        Ch12 (84): 1ºH × 2ºJ
Ch5 (77): 1ºI × Melhor 3º  Ch13 (85): 1ºB × Melhor 3º
Ch6 (78): 2ºE × 2ºI        Ch14 (86): 1ºJ × 2ºH
Ch7 (79): 1ºA × Melhor 3º  Ch15 (87): 1ºK × Melhor 3º
Ch8 (80): 1ºL × Melhor 3º  Ch16 (88): 2ºD × 2ºG
```

Oitavas (propagação oficial): A=W74×W77 · B=W73×W75 · C=W76×W78 · D=W79×W80 · E=W83×W84 · F=W81×W82 · G=W86×W88 · H=W85×W87. Quartas: Q1=W89×W90 · Q2=W93×W94 · Q3=W91×W92 · Q4=W95×W96. Semis: SF1=W97×W98 · SF2=W99×W100. Datas/horários também atualizados conforme cronograma oficial.

Validado: sem duplicatas, cada grupo com exatamente 2 referências, 8 vagas de melhor 3º, propagação das oitavas conferida contra a FIFA.

**Nota sobre a v4:** a correção anterior (Ch11 2ºC→2ºK) era insuficiente — o mapeamento inteiro precisou ser refeito. Esta v5 substitui aquela.
