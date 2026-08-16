# RPG de Mesa

Plataforma de RPG de mesa com múltiplas ambientações, dados e fichas in-game,
single e multiplayer até 6 jogadores, e um Mestre que pode ser humano ou IA.

```bash
npm install
npm run build
npm run dev          # servidor em :8787, cliente em :5173
```

Abra `http://localhost:5173`. Sem nenhuma configuração a plataforma já roda —
com o Mestre Offline. Para habilitar o Mestre IA, copie `.env.example` para
`.env` e preencha `ANTHROPIC_API_KEY`.

---

## O que existe hoje

| | |
|---|---|
| **Ambientações** | Tibia (completa), Horror Cósmico e O Aro Exterior (preview) |
| **Dados** | Notação completa, RNG semeado e auditável |
| **Fichas** | Criação, progressão, inventário, magias, condições |
| **Multiplayer** | Até 6 jogadores por mesa, código de entrada, reconexão |
| **Mestre** | Humano (painel completo) ou IA (Claude Opus 5) |
| **Trilha sonora** | Sintetizada no navegador, uma paleta por ambientação |

---

## Arquitetura

Monorepo npm com três pacotes:

```
packages/
  shared/   motor de regras, dados e catálogos de ambientação (sem I/O)
  server/   Express + Socket.IO + SQLite + Mestre IA
  client/   React + Vite, UI temática dirigida pela ambientação
```

### A decisão central: ambientação é dado, não código

Uma ambientação é uma `SettingDefinition` — um objeto que descreve o modelo de
personagem, os catálogos de conteúdo, o tema visual, a trilha sonora e a persona
do Mestre. O motor de regras e a UI leem daí e não conhecem nenhum mundo em
particular.

Consequência prática: **adicionar um mundo novo é adicionar uma entrada em
`packages/shared/src/settings/registry.ts`**. Não se toca no motor, não se toca
em React, não se escreve CSS. A tela de criação de personagem monta os atributos
certos, o painel do Mestre lista o bestiário certo, e a UI inteira muda de cara
porque os componentes são escritos contra variáveis CSS que o tema preenche.

```ts
// O motor nunca sabe que Tibia existe — só que a ambientação tem vitais.
export function maxVital(vital, level, attributes, multiplier = 1) {
  const { base, perLevel, fromAttribute } = vital.formula;
  let value = base + perLevel * (level - 1);
  if (fromAttribute) {
    value += (attributes[fromAttribute.attributeId] ?? 0) * fromAttribute.multiplier;
  }
  return Math.max(1, Math.floor(value * multiplier));
}
```

### Dados auditáveis

Rolagem de mesa que ninguém consegue conferir é rolagem em que ninguém confia.
Toda rolagem registra a semente que a gerou, e o RNG (xoshiro128\*\* semeado por
hash da string) é determinístico: repetir a semente reproduz o resultado exato.
A UI mostra a semente embaixo de cada rolagem.

O parser aceita `2d6+3`, `4d6kh3` (mantém os 3 maiores), `2d20kl1`
(desvantagem), `3d6!` (explosivos) e somas de vários termos — com limites que
impedem `9999d9999` de derrubar o servidor.

### O Mestre IA não é privilegiado

O Mestre IA opera **exatamente o mesmo conjunto de ações** que o Mestre humano
aciona pelo painel, expostas como 15 ferramentas. Se uma ação não existe no
painel, a IA também não pode executá-la. Os ids que ela passa são validados no
gerenciador de mesas, não na confiança do modelo — um id inventado volta como
erro para o modelo corrigir, não corrompe o estado.

A narração chega em streaming: a entrada de log nasce vazia e cresce por deltas,
então a mesa vê o texto aparecer em vez de esperar o turno inteiro.

O prompt é dividido em duas partes por um motivo específico:

- **prefixo estável por ambientação** (cânone, regras, catálogos) — vai no
  `system` com `cache_control`, então o custo é pago uma vez e não por turno;
- **contexto volátil do turno** (cena, fichas, combate, log recente) — vai
  depois, na mensagem do usuário.

Inverter essa ordem invalidaria o cache a cada rolagem de dado.

Como o histórico de mensagens é truncado, o Mestre mantém uma **crônica da
campanha** via ferramenta — a memória de longo prazo que sobrevive ao corte.

### Permissões são do servidor

Cada socket recebe uma projeção do estado **já filtrada pelo seu papel**.
Rolagens secretas e notas de Mestre nunca chegam ao cliente de um jogador — não
são enviadas e escondidas por CSS, simplesmente não são enviadas.

Na mesma linha, o cliente não consegue alterar nível, experiência, vitais nem
atributos do próprio personagem: só nome, anotações e inventário. O resto é ação
de Mestre. Um cliente adulterado não vira trapaça.

### Trilha sonora sem arquivos

Cada faixa é uma escala, uma progressão de acordes e um timbre, sintetizados no
navegador com Web Audio. Zero downloads, zero licenças, zero megabytes — e
"uma trilha por ambientação" passa a ser viável. O Mestre troca a faixa e todos
na mesa ouvem a mudança.

---

## Tibia

A ambientação completa. O que está modelado:

- **Perícias como atributos** — Espada, Machado, Clava, Distância, Escudo,
  Magia, Punho e Pesca. A ficha é reconhecível para quem conhece o jogo.
- **5 vocações** com promoção no nível 20 (Cavaleiro de Elite, Paladino Real,
  Mestre Feiticeiro, Druida Ancião) e **7 origens** de cidade.
- **30 magias** com a invocação canônica: `exura`, `exori ico`,
  `exevo gran mas frigo`, `utamo vita`, `utana vid`.
- **23 criaturas**, de Rato a Ferumbras, com loot, habitats, imunidades e
  fraquezas.
- **27 locais** hierárquicos, de Rookgaard a Goroma, cada um com ganchos
  narrativos que o Mestre pode puxar.
- **40 itens**, do Porrete à Excalibug — que, por cânone, o Mestre IA nunca
  entrega sem autorização explícita.
- **Cânone** dos deuses (Fafnar, Uman, Zathroth, Banor, Crunor, Suon, Fardos),
  da morte e do templo, e da reivindicação minotaura.

Horror Cósmico e O Aro Exterior estão marcados como **preview**: tema, regras e
modelo de personagem completos e jogáveis, catálogos ainda enxutos.

---

## Configuração

| Variável | Padrão | Para quê |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Habilita o Mestre IA. Sem ela, Mestre Offline. |
| `RPG_GM_MODEL` | `claude-opus-5` | Modelo do Mestre. |
| `RPG_GM_EFFORT` | `medium` | `low`…`max`. Numa mesa, latência é qualidade. |
| `PORT` | `8787` | Porta do servidor. |
| `RPG_DB_PATH` | `./data/rpg.db` | Banco SQLite. |

---

## Desenvolvimento

```bash
npm test           # 52 testes: motor de dados, regras e integridade dos catálogos
npm run typecheck  # os três pacotes
npm run build      # tudo; o servidor passa a servir o cliente compilado
npm start          # produção, uma porta só
```

Os testes de integridade valem a pena mencionar: todo item inicial de vocação,
todo loot de criatura, todo habitat e toda faixa musical referenciada precisam
apontar para um id que existe. Um typo em `bestiary.ts` quebra o build, não a
mesa de alguém no meio de um combate.

---

## Próximos passos naturais

- Preencher Horror Cósmico e O Aro Exterior no nível de detalhe de Tibia.
- Companheiros NPC controlados pela IA nos assentos vazios (a opção já existe
  na criação da mesa; falta o loop que dá turno a eles).
- Mapa tático com posicionamento — hoje o combate é abstrato.
- Contas e campanhas persistentes entre sessões.
