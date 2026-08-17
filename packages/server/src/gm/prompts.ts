/**
 * Construção do prompt do Mestre IA.
 *
 * A montagem é deliberadamente dividida em duas partes:
 *
 *   1. `buildSystemPrompt(setting)` — estável por ambientação. É o bloco caro
 *      (cânone + catálogos + campanha) e vai no `system` com `cache_control`,
 *      então o custo é pago uma vez e não por turno.
 *   2. `buildTurnContext(table)` — volátil, muda a cada turno, e por isso vai
 *      na mensagem do usuário, depois do prefixo cacheado.
 *
 * Inverter essa ordem invalidaria o cache a cada rolagem de dado.
 *
 * A régua para decidir o que entra: o prefixo é cobrado uma vez, mas o turno é
 * cobrado sempre. Detalhe que o Mestre consulta de vez em quando não vai no
 * prompt — vai na ferramenta `lookup`.
 */

import type { SettingDefinition, TableState } from '@rpg/shared';
import { carryStatus, healthVitalId } from '@rpg/shared';

import { config } from '../config.js';

export function buildSystemPrompt(setting: SettingDefinition): string {
  const attributes = setting.characterModel.attributes.map((a) => a.id).join(', ');
  const vitals = setting.characterModel.vitals.map((v) => v.id).join(', ');
  const difficulties = setting.rules.difficulties.map((d) => `${d.name}=${d.value}`).join(', ');

  // Catálogos compactos: o Mestre precisa dos ids para chamar as ferramentas,
  // mas não das descrições — essas custariam milhares de tokens e estão a uma
  // chamada de `lookup` de distância quando fizerem falta.
  const bestiary = setting.bestiary
    .map((b) => `${b.id}(a${b.threat},${b.experience}xp)`)
    .join(' ');

  const locations = setting.locations
    .map((l) => (l.recommendedLevel ? `${l.id}(${l.recommendedLevel.join('-')})` : l.id))
    .join(' ');

  const tracks = setting.tracks.map((t) => `${t.id}(${t.mood})`).join(' ');
  const items = setting.items.map((i) => i.id).join(' ');
  const abilities = setting.abilities
    .map((a) => (a.incantation ? `${a.id}="${a.incantation}"` : a.id))
    .join(' ');

  const campaign = setting.campaign
    ? `\n# Campanha: ${setting.campaign.title}
${setting.campaign.premise}
${setting.campaign.acts
  .map((act) => `- ${act.title} (níveis ${act.levels[0]}-${act.levels[1]}): ${act.goal}`)
  .join('\n')}
Conduza o ato compatível com o nível do grupo. Não empurre o grupo para o ato seguinte antes da hora, e não fique preso no atual quando ele já se resolveu.\n`
    : '';

  const companions = setting.companions?.length
    ? `\n# Companheiros que você interpreta
Quando um deles estiver no grupo, ele é seu: fala, opina, age no combate e discorda. Nunca decide pelos personagens dos jogadores.
${setting.companions
  .map((c) => `- ${c.name} (${c.classId}): ${c.personality} Fala assim: ${c.catchphrases.join(' ')}`)
  .join('\n')}\n`
    : '';

  return `Você é o Mestre de uma mesa de RPG na ambientação "${setting.name}".

# Voz e tom
${setting.gameMaster.voice}

Registro esperado:
${setting.gameMaster.styleExamples.map((example) => `- ${example}`).join('\n')}

# Cânone — regras que você não viola
${setting.gameMaster.canon.map((rule) => `- ${rule}`).join('\n')}
${campaign}${companions}
# Como conduzir a mesa
- Descreva o mundo e as consequências. Nunca decida o que os personagens dos jogadores fazem, sentem ou dizem.
- Ação de resultado incerto: chame \`request_check\` e **pare por aí**. O jogador é quem rola. Você narra a consequência no turno seguinte, quando o resultado chegar. Nunca invente o resultado nem role pelo jogador. Ação trivial não precisa de teste.
- Toda mudança de estado passa por ferramenta. Narrar que o golpe acertou sem chamar \`damage\` deixa a ficha errada.
- Uma narração por turno, 2 a 5 frases, terminando onde os jogadores possam agir. Não escreva o turno deles.
- Seja econômico com ferramentas: use o mínimo necessário por turno. Cada uma custa tempo e dinheiro à mesa.
- Combate: \`start_combat\` para a iniciativa, \`damage\`/\`heal\` a cada golpe, \`next_turn\` entre turnos, \`end_combat\` no fim, \`grant_xp\` na vitória.
- Ao mudar de lugar ou de clima, \`set_scene\` — a interface e a trilha acompanham.
- Ao fim de uma cena importante, \`update_chronicle\`. O histórico é truncado; a crônica, não.

# Sistema de regras
- Teste: ${setting.rules.checkDice}, atributo na escala "${setting.rules.attributeScaling}". Dificuldades: ${difficulties}.
- Natural ${setting.rules.criticalRange.successAtOrAbove}+ é crítico; ${setting.rules.criticalRange.failureAtOrBelow}- é falha crítica.
- Atributos: ${attributes}. Vitais: ${vitals} (vida = "${healthVitalId(setting)}").

# Catálogos — use estes ids exatos. Nunca invente um id.
Criaturas (a=ameaça): ${bestiary}
Locais: ${locations}
Trilhas: ${tracks}
Itens: ${items}
${setting.labels.ability}s: ${abilities}

Precisa dos números de uma criatura, item ou magia? Chame \`lookup\`. Precisa de algo que não está nas listas? Descreva na narração, sem ferramenta.`;
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
      const seat = table.participants.find((p) => p.characterId === character.id);
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
      // Marcar quem é NPC é o que faz o Mestre saber por quem pode falar.
      const controller = seat?.seat === 'npc' ? ' [companheiro — você o interpreta]' : '';

      return (
        `- ${character.name} (id: ${character.id})${controller} — ${vocation?.name ?? character.classId}, ` +
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

  if (table.pendingChecks.length > 0) {
    const waiting = table.pendingChecks
      .map((check) => {
        const character = table.characters.find((c) => c.id === check.characterId);
        return `- ${character?.name ?? check.characterId}: ${check.attributeId} vs ${check.difficulty} (${check.reason})`;
      })
      .join('\n');
    parts.push(
      `# Testes que você já pediu e ainda não foram rolados\n${waiting}\n` +
        'Não peça de novo e não resolva sozinho. Narre a espera ou trate de outra coisa.',
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

  // Log recente: o suficiente para lembrar do que acabou de acontecer, e não
  // mais do que isso — a memória longa é a crônica, que custa muito menos.
  const recent = table.log.slice(-config.gmLogWindow);
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
