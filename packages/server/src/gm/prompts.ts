/**
 * Construção do prompt do Mestre IA.
 *
 * A montagem é deliberadamente dividida em duas partes:
 *
 *   1. `buildSystemPrompt(setting)` — estável por ambientação. É o bloco caro
 *      (cânone + catálogos) e vai no `system` com `cache_control`, então o
 *      custo é pago uma vez por ambientação e não por turno.
 *   2. `buildTurnContext(table)` — volátil, muda a cada turno, e por isso vai
 *      na mensagem do usuário, depois do prefixo cacheado.
 *
 * Inverter essa ordem invalidaria o cache a cada rolagem de dado.
 */

import type { SettingDefinition, TableState } from '@rpg/shared';
import { carryStatus, healthVitalId } from '@rpg/shared';

export function buildSystemPrompt(setting: SettingDefinition): string {
  const attributes = setting.characterModel.attributes
    .map((a) => `${a.id} (${a.name})`)
    .join(', ');

  const vitals = setting.characterModel.vitals.map((v) => `${v.id} (${v.name})`).join(', ');

  const difficulties = setting.rules.difficulties
    .map((d) => `${d.name} = ${d.value}`)
    .join(', ');

  // Catálogos compactos: o Mestre precisa dos ids para chamar as ferramentas,
  // mas não precisa das descrições completas — elas custariam milhares de
  // tokens por turno sem melhorar as decisões.
  const bestiary = setting.bestiary
    .map((b) => `${b.id} (${b.name}, ameaça ${b.threat}, ${b.experience} xp)`)
    .join('\n  ');

  const locations = setting.locations
    .map((l) => {
      const level = l.recommendedLevel ? ` níveis ${l.recommendedLevel[0]}-${l.recommendedLevel[1]}` : '';
      return `${l.id} (${l.name}, ${l.kind}${level})`;
    })
    .join('\n  ');

  const tracks = setting.tracks.map((t) => `${t.id} (${t.name}, ${t.mood})`).join('\n  ');

  const items = setting.items.map((i) => `${i.id} (${i.name})`).join(', ');

  const abilities = setting.abilities
    .map((a) => `${a.id}${a.incantation ? ` "${a.incantation}"` : ''} (${a.name})`)
    .join(', ');

  return `Você é o Mestre de uma mesa de RPG na ambientação "${setting.name}".

# Voz e tom
${setting.gameMaster.voice}

Exemplos do registro esperado:
${setting.gameMaster.styleExamples.map((example) => `- ${example}`).join('\n')}

# Cânone — regras que você não viola
${setting.gameMaster.canon.map((rule) => `- ${rule}`).join('\n')}

# Como conduzir a mesa
- Descreva o mundo e as consequências. Nunca decida o que os personagens dos jogadores fazem, sentem ou dizem.
- Quando um jogador declara uma ação de resultado incerto, peça um teste com a ferramenta \`request_check\` em vez de decidir o resultado sozinho. Ações triviais não precisam de teste.
- Use as ferramentas para mudar o estado do jogo. Narrar que o orc morreu sem chamar \`damage\` deixa a ficha errada e o grupo confuso.
- Uma narração por turno, entre 2 e 6 frases. Termine sempre em um ponto onde os jogadores possam agir.
- Nunca revele rolagens secretas, estatísticas de criaturas nem seus planos. Use \`narrate\` com \`gm_only\` quando precisar registrar algo só para você.
- Ao mudar de local ou de clima, chame \`set_scene\` — a interface e a trilha sonora acompanham.
- Combate: chame \`start_combat\` para rolar iniciativa, \`damage\`/\`heal\` a cada golpe, \`next_turn\` entre turnos e \`end_combat\` ao final. Conceda experiência com \`grant_xp\` quando o grupo superar um desafio.
- Ao fim de uma cena importante, atualize \`update_chronicle\` com um resumo curto do que ficou decidido. Essa é a sua memória de longo prazo: o histórico de mensagens é truncado, a crônica não.

# Sistema de regras
- Dado de teste: ${setting.rules.checkDice}. O bônus do atributo entra na escala "${setting.rules.attributeScaling}".
- Dificuldades: ${difficulties}.
- Crítico: resultado natural ${setting.rules.criticalRange.successAtOrAbove}+ é sucesso crítico; ${setting.rules.criticalRange.failureAtOrBelow} ou menos é falha crítica.
- Atributos: ${attributes}.
- Vitais: ${vitals}. O vital de vida é "${healthVitalId(setting)}".

# Catálogos — use estes ids exatos nas ferramentas

## Criaturas (${setting.bestiary.length})
  ${bestiary}

## Locais (${setting.locations.length})
  ${locations}

## Trilhas
  ${tracks}

## Itens
${items}

## ${setting.labels.ability}s
${abilities}

Nunca invente um id que não esteja nestas listas. Se precisar de algo que não existe no catálogo, descreva na narração sem chamar ferramenta.`;
}

/**
 * Contexto do turno: cena, grupo, combate e log recente.
 *
 * Fica na mensagem do usuário, depois do prefixo cacheado, justamente porque
 * muda a cada turno.
 */
export function buildTurnContext(table: TableState, setting: SettingDefinition): string {
  const parts: string[] = [];

  if (table.chronicle.trim()) {
    parts.push(`# Crônica da campanha até aqui\n${table.chronicle.trim()}`);
  }

  const location = table.scene.locationId
    ? setting.locations.find((l) => l.id === table.scene.locationId)
    : undefined;

  parts.push(
    `# Cena atual\n` +
      `Título: ${table.scene.title}\n` +
      (location ? `Local: ${location.name} (${location.id})\n` : '') +
      `Descrição: ${table.scene.description}`,
  );

  // Fichas do grupo — o Mestre precisa dos números para calibrar dificuldade.
  if (table.characters.length > 0) {
    const sheets = table.characters.map((character) => {
      const vocation = setting.characterModel.classes.find((c) => c.id === character.classId);
      const vitals = Object.entries(character.vitals)
        .map(([id, vital]) => `${id} ${vital.current}/${vital.max}`)
        .join(', ');
      const topAttributes = setting.characterModel.attributes
        .filter((a) => a.primary)
        .map((a) => `${a.id} ${character.attributes[a.id] ?? 0}`)
        .join(', ');
      const carry = carryStatus(character, setting);
      const conditions = character.conditions.length
        ? ` | condições: ${character.conditions.join(', ')}`
        : '';

      return (
        `- ${character.name} (id: ${character.id}) — ${vocation?.name ?? character.classId}, ` +
        `nível ${character.level}, ${vitals} | ${topAttributes}` +
        (carry ? ` | carga ${carry.carried}/${carry.capacity}` : '') +
        conditions +
        `\n  ${setting.labels.ability}s: ${character.abilities.join(', ') || 'nenhuma'}` +
        `\n  Inventário: ${
          character.inventory
            .map((entry) => {
              const item = setting.items.find((i) => i.id === entry.itemId);
              return `${item?.name ?? entry.itemId}${entry.quantity > 1 ? ` ×${entry.quantity}` : ''}${entry.equipped ? ' (equipado)' : ''}`;
            })
            .join(', ') || 'vazio'
        }`
      );
    });
    parts.push(`# ${setting.labels.party}\n${sheets.join('\n')}`);
  } else {
    parts.push(
      `# ${setting.labels.party}\nNenhum personagem criado ainda. Conduza a cena de forma que os jogadores possam se apresentar.`,
    );
  }

  if (table.scene.inCombat) {
    const combatants = table.scene.combatants
      .map((combatant) => {
        const vitals = Object.entries(combatant.vitals)
          .map(([id, vital]) => `${id} ${vital.current}/${vital.max}`)
          .join(', ');
        const active = combatant.id === table.scene.activeTurn ? ' ← vez dele' : '';
        return `- ${combatant.name} (id: ${combatant.id}, ${combatant.hostile ? 'hostil' : 'aliado'}) — ${vitals}${active}`;
      })
      .join('\n');
    parts.push(`# COMBATE EM ANDAMENTO\n${combatants}`);
  } else if (table.scene.combatants.length > 0) {
    const present = table.scene.combatants.map((c) => `${c.name} (id: ${c.id})`).join(', ');
    parts.push(`# Criaturas em cena (fora de combate)\n${present}`);
  }

  // Log recente: o suficiente para o Mestre lembrar do que acabou de acontecer.
  const recent = table.log.slice(-24);
  if (recent.length > 0) {
    const transcript = recent
      .map((entry) => {
        switch (entry.kind) {
          case 'narration':
            return `[Mestre] ${entry.text}`;
          case 'speech':
            return `[${entry.authorName}] "${entry.text}"`;
          case 'ooc':
            return `[${entry.authorName}, fora de personagem] ${entry.text}`;
          case 'roll':
            return `[dado] ${entry.text}`;
          default:
            return `[sistema] ${entry.text}`;
        }
      })
      .join('\n');
    parts.push(`# O que aconteceu recentemente\n${transcript}`);
  }

  return parts.join('\n\n');
}
