# RPG de Mesa

Plataforma de RPG de mesa com múltiplas ambientações, dados e fichas in-game,
single e multiplayer até 6 jogadores, e um Mestre que pode ser humano ou IA.

## Rodando pela primeira vez

### Passo 0 — instale o Node

Se `node -v` no terminal não responder `v20` ou maior, baixe a versão **LTS**
em [nodejs.org](https://nodejs.org) e instale.

> **Onde é o terminal?** Windows: procure por `PowerShell` no menu iniciar.
> macOS: `Terminal`, na pasta Utilitários. Linux: você já sabe.

### Passo 1 — baixe e instale

Um comando de cada vez:

```bash
git clone https://github.com/penatrix/rpg-de-mesa.git
cd rpg-de-mesa
npm install
```

O `git clone` cria a pasta `rpg-de-mesa` **dentro do diretório em que o
terminal estava**. Ao abrir um terminal novo, isso é a sua pasta pessoal — ou
seja, quase sempre:

| Sistema | Caminho |
|---|---|
| Windows | `C:\Users\SeuNome\rpg-de-mesa` |
| macOS | `/Users/SeuNome/rpg-de-mesa` |
| Linux | `/home/seunome/rpg-de-mesa` |

Perdeu de vista? `pwd` (ou `cd` no Windows) mostra onde você está agora. Para
procurar a pasta:

```bash
# macOS / Linux
find ~ -maxdepth 3 -type d -name rpg-de-mesa 2>/dev/null

# Windows PowerShell
Get-ChildItem $HOME -Filter rpg-de-mesa -Recurse -Depth 3 -Directory -ErrorAction SilentlyContinue
```

O `npm install` demora um pouco na primeira vez e termina imprimindo um resumo
com o que falta configurar — incluindo o **caminho absoluto** do arquivo `.env`.

### Passo 2 — rode

```bash
npm run dev
```

Quando aparecer `RPG de Mesa — servidor em http://localhost:8787`, abra
**http://localhost:5173** no navegador. Para parar, `Ctrl+C` no terminal.

Já dá para jogar assim: escolha Tibia, dê um nome, crie a mesa e o personagem.

### Passo 3 (opcional) — ligue o Mestre IA

Sem chave você joga com o **Mestre Offline**, que só puxa ganchos prontos da
ambientação — serve para testar, mas não conduz uma história. Para ter o Mestre
de verdade, que narra, rola dados e controla as criaturas:

1. Entre em [console.anthropic.com](https://console.anthropic.com) e crie a conta
2. Em **Billing**, adicione créditos (o uso é cobrado por token)
3. Em **API Keys**, clique em **Create Key** e copie o valor
4. Abra o arquivo `.env` — ele fica na raiz do projeto, ao lado do
   `package.json`. Como o nome começa com ponto, o Finder e o Explorer o
   **escondem**; o jeito mais simples é abrir pelo terminal, de dentro da pasta
   do projeto:

```bash
nano .env        # macOS / Linux  (salvar: Ctrl+O, Enter; sair: Ctrl+X)
notepad .env     # Windows
```

5. Cole a chave depois do sinal de igual, sem aspas e sem espaços:

```
ANTHROPIC_API_KEY=sk-ant-...
```

6. Pare o servidor (`Ctrl+C`) e rode `npm run dev` de novo

> Se `.env` não existir, é porque o `npm install` ainda não rodou nesta pasta.
> Rode `npm run setup` — ele cria o arquivo e imprime o caminho completo dele.

A chave aparece **uma única vez** na tela — se perder, crie outra. O `.env`
nunca é enviado ao repositório, e a chave não deve ser compartilhada com
ninguém, nem colada em conversas.

Para conferir se pegou, rode `npm run setup` — ele diz se a chave está lá sem
nunca mostrá-la.

### Modo produção (uma porta só)

```bash
npm run build
npm start            # API, WebSocket e cliente em http://localhost:8787
```

---

## Jogar com outras pessoas

Três caminhos, do mais rápido ao mais permanente.

### 1. Mesma rede (casa, escritório)

Suba com `npm run dev` e descubra seu IP local:

```bash
hostname -I | awk '{print $1}'      # Linux
ipconfig getifaddr en0              # macOS
```

Os outros acessam `http://SEU-IP:5173` e entram com o código da mesa. O
servidor de desenvolvimento já escuta em todas as interfaces.

### 2. Internet agora, sem publicar nada (túnel)

O caminho mais rápido para jogar hoje à noite. Suba em modo produção e exponha
a porta com um túnel:

```bash
npm run build && npm start

# noutro terminal — sem cadastro, sem instalação permanente:
npx cloudflared tunnel --url http://localhost:8787
```

Ele imprime uma URL `https://algo-aleatorio.trycloudflare.com`. Mande para o
grupo. Funciona porque tudo — página, API e WebSocket — vive na mesma porta.

A URL morre quando você fecha o terminal, e a mesa roda na sua máquina: se você
desligar, a sessão acaba. Para uma campanha contínua, veja o próximo item.

### 3. Publicado de verdade

#### Vercel e GitHub Pages não servem

Não é questão de configuração — é incompatibilidade de arquitetura, e vale
entender por quê antes de perder tempo tentando:

| | O que oferece | O que esta plataforma precisa |
|---|---|---|
| **GitHub Pages** | Só arquivos estáticos | Um processo Node rodando |
| **Vercel** | Funções que sobem, respondem e morrem | Um processo que fica **vivo** entre as jogadas |

O jogo inteiro acontece sobre uma conexão WebSocket permanente: quando o Mestre
aplica dano, o servidor empurra a mudança para os seis navegadores na hora.
Função serverless não mantém conexão aberta, e o disco dela é descartado a cada
invocação — o SQLite não teria onde morar. Um front-end estático no Vercel
ainda precisaria de um servidor em outro lugar, o que é mais trabalho, não menos.

#### Render (recomendado)

Tem plano gratuito, WebSocket nativo e um `render.yaml` já no repositório:

1. Entre em [render.com](https://render.com) e conecte sua conta do GitHub
2. **New** → **Blueprint** → escolha o repositório `rpg-de-mesa`
3. O Render lê o `render.yaml` sozinho e pede uma coisa só: o valor de
   `ANTHROPIC_API_KEY`. Cole ali — é o painel do Render, não um arquivo do repo
4. **Apply**. O primeiro build leva alguns minutos

No fim você recebe uma URL `https://rpg-de-mesa.onrender.com`. Manda no grupo.

Duas características do plano gratuito, para não te pegarem de surpresa:

- **Dorme após ~15 minutos parado.** O primeiro acesso depois disso demora uns
  50 segundos para acordar. Durante a sessão, com gente jogando, fica de pé.
- **Sem disco persistente**, então o SQLite mora em `/tmp` e o histórico some a
  cada reinício. As mesas seguem em memória enquanto se joga; o que se perde é
  a campanha entre reinícios. Para resolver, mude `plan` para `starter` no
  `render.yaml` e descomente o bloco `disk`.

#### Outras plataformas

Railway, Fly.io, Koyeb ou qualquer VPS servem igual. Há um `Dockerfile` pronto:

```bash
docker build -t rpg-de-mesa .
docker run -p 8787:8787 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -v rpg-data:/app/data \
  rpg-de-mesa
```

Se preferir build nativo em vez de contêiner, use exatamente estes comandos:

```
build:  npm install --include=dev && npm run build
start:  npm start
```

O `--include=dev` **não é opcional**: plataformas de deploy definem
`NODE_ENV=production`, e nesse modo o npm pula as devDependencies — onde vivem
o TypeScript e o Vite. Sem a flag o build falha com `tsc: not found`.

O que o serviço precisa oferecer:

| Requisito | Por quê |
|---|---|
| **WebSocket** | O jogo inteiro roda por Socket.IO. Sem isso, nada funciona. |
| `PORT` respeitado | O servidor lê a variável; a maioria das plataformas injeta. |
| **Disco persistente** (desejável) | Sem volume, o histórico some a cada redeploy. |

> **Não há autenticação.** Quem tiver a URL pode criar mesas, e quem tiver o
> código de 6 caracteres entra na sua. Para um grupo de amigos isso basta; para
> algo exposto e duradouro, ponha atrás de um proxy com senha.

### Se algo não subir

| Sintoma | Causa |
|---|---|
| `Cannot find module '@rpg/shared'` | Rode `npm run build -w @rpg/shared`. O `npm install` e o `npm run dev` já fazem isso automaticamente. |
| `better-sqlite3` falha ao instalar | Node abaixo de 20, ou falta toolchain de build. `node -v` para conferir. |
| Porta 5173 ou 8787 ocupada | `PORT=9000 npm run dev` muda a do servidor; a do cliente fica em `packages/client/vite.config.ts`. |

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
