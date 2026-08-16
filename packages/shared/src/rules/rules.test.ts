import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { requireSetting, listSettings, listSettingSummaries } from '../settings/registry.js';
import { createCharacter, experienceForLevel, grantExperience, carryStatus, RulesError } from './character.js';
import { performCheck, attributeBonus, difficultyLabel } from './checks.js';
import { applyDamage, applyHealing, combatantFromBestiary, combatResolution, healthVitalId } from './combat.js';

const tibia = requireSetting('tibia');

describe('registro de ambientações', () => {
  it('expõe as três ambientações', () => {
    const ids = listSettings().map((s) => s.id).sort();
    assert.deepEqual(ids, ['cosmic-horror', 'space-opera', 'tibia']);
  });

  it('só Tibia está marcada como completa', () => {
    const complete = listSettings().filter((s) => s.status === 'complete').map((s) => s.id);
    assert.deepEqual(complete, ['tibia']);
  });

  it('gera resumos sem carregar o conteúdo pesado', () => {
    const summary = listSettingSummaries().find((s) => s.id === 'tibia');
    assert.ok(summary);
    assert.ok(summary.bestiaryCount > 15);
  });

  it('lança em id desconhecido', () => {
    assert.throws(() => requireSetting('nao-existe'), /Ambientação desconhecida/);
  });
});

describe('integridade dos dados de Tibia', () => {
  it('todo item inicial de vocação existe no catálogo', () => {
    const itemIds = new Set(tibia.items.map((i) => i.id));
    for (const vocation of tibia.characterModel.classes) {
      for (const itemId of vocation.startingItems) {
        assert.ok(itemIds.has(itemId), `item ausente: ${itemId} (${vocation.name})`);
      }
    }
  });

  it('toda magia inicial de vocação existe no catálogo', () => {
    const abilityIds = new Set(tibia.abilities.map((a) => a.id));
    for (const vocation of tibia.characterModel.classes) {
      for (const abilityId of vocation.startingAbilities) {
        assert.ok(abilityIds.has(abilityId), `magia ausente: ${abilityId} (${vocation.name})`);
      }
    }
  });

  it('todo loot do bestiário aponta para um item real', () => {
    const itemIds = new Set(tibia.items.map((i) => i.id));
    for (const entry of tibia.bestiary) {
      for (const drop of entry.loot) {
        assert.ok(itemIds.has(drop.itemId), `loot ausente: ${drop.itemId} (${entry.name})`);
      }
    }
  });

  it('todo habitat do bestiário aponta para um local real', () => {
    const locationIds = new Set(tibia.locations.map((l) => l.id));
    for (const entry of tibia.bestiary) {
      for (const habitat of entry.habitats) {
        assert.ok(locationIds.has(habitat), `local ausente: ${habitat} (${entry.name})`);
      }
    }
  });

  it('toda faixa referenciada por local existe', () => {
    const trackIds = new Set(tibia.tracks.map((t) => t.id));
    for (const location of tibia.locations) {
      if (location.trackId) {
        assert.ok(trackIds.has(location.trackId), `faixa ausente: ${location.trackId}`);
      }
    }
  });

  it('todo local pai existe', () => {
    const locationIds = new Set(tibia.locations.map((l) => l.id));
    for (const location of tibia.locations) {
      if (location.parentId) {
        assert.ok(locationIds.has(location.parentId), `pai ausente: ${location.parentId}`);
      }
    }
  });

  it('não há ids duplicados em nenhum catálogo', () => {
    for (const setting of listSettings()) {
      for (const [label, list] of [
        ['itens', setting.items],
        ['habilidades', setting.abilities],
        ['bestiário', setting.bestiary],
        ['locais', setting.locations],
        ['vocações', setting.characterModel.classes],
        ['atributos', setting.characterModel.attributes],
      ] as const) {
        const ids = list.map((entry) => entry.id);
        assert.equal(new Set(ids).size, ids.length, `ids duplicados em ${label} de ${setting.id}`);
      }
    }
  });

  it('todas as ambientações declaram ao menos uma cena de abertura', () => {
    for (const setting of listSettings()) {
      assert.ok(setting.gameMaster.openings.length > 0, `sem abertura: ${setting.id}`);
    }
  });
});

describe('criação de personagem', () => {
  it('aplica modificadores de vocação e origem', () => {
    const knight = createCharacter(tibia, {
      id: 'c1',
      name: 'Bors',
      classId: 'knight',
      originId: 'thais-citizen',
    });
    // base 10 + vocação 5 + origem 3
    assert.equal(knight.attributes.sword, 18);
    assert.equal(knight.level, 1);
  });

  it('calcula vitais pela fórmula com o multiplicador da vocação', () => {
    const knight = createCharacter(tibia, { id: 'c1', name: 'Bors', classId: 'knight' });
    const sorcerer = createCharacter(tibia, { id: 'c2', name: 'Vel', classId: 'sorcerer' });
    assert.ok(knight.vitals.hp!.max > sorcerer.vitals.hp!.max, 'Cavaleiro tem mais vida');
    assert.ok(sorcerer.vitals.mana!.max > knight.vitals.mana!.max, 'Feiticeiro tem mais mana');
    assert.equal(knight.vitals.hp!.current, knight.vitals.hp!.max);
  });

  it('concede itens e magias iniciais', () => {
    const druid = createCharacter(tibia, { id: 'c3', name: 'Fen', classId: 'druid' });
    assert.ok(druid.abilities.includes('exura'));
    assert.ok(druid.inventory.some((e) => e.itemId === 'snakebite-rod'));
    // Consumíveis não vêm equipados.
    const potion = druid.inventory.find((e) => e.itemId === 'health-potion');
    assert.equal(potion?.equipped, false);
  });

  it('respeita o teto de pontos livres', () => {
    assert.throws(
      () => createCharacter(tibia, { id: 'c4', name: 'X', classId: 'knight', allocations: { sword: 99 } }),
      RulesError,
    );
  });

  it('rejeita vocação e atributo desconhecidos', () => {
    assert.throws(() => createCharacter(tibia, { id: 'c5', name: 'X', classId: 'bardo' }), RulesError);
    assert.throws(
      () => createCharacter(tibia, { id: 'c6', name: 'X', classId: 'knight', allocations: { carisma: 1 } }),
      RulesError,
    );
  });

  it('nunca ultrapassa o teto do atributo', () => {
    const character = createCharacter(tibia, {
      id: 'c7',
      name: 'X',
      classId: 'sorcerer',
      allocations: { magic: 12 },
    });
    const magic = tibia.characterModel.attributes.find((a) => a.id === 'magic')!;
    assert.ok(character.attributes.magic! <= magic.max);
  });
});

describe('progressão', () => {
  it('a curva de XP é monotônica', () => {
    let previous = -1;
    for (let level = 1; level <= 50; level++) {
      const required = experienceForLevel(tibia, level);
      assert.ok(required > previous, `curva não cresce no nível ${level}`);
      previous = required;
    }
  });

  it('sobe vários níveis de uma vez e restaura os vitais', () => {
    const character = createCharacter(tibia, { id: 'c8', name: 'X', classId: 'knight' });
    character.vitals.hp!.current = 1;
    const result = grantExperience(character, tibia, 50000);
    assert.ok(result.levelsGained > 1);
    assert.equal(result.character.vitals.hp!.current, result.character.vitals.hp!.max);
  });

  it('sinaliza a promoção no nível certo', () => {
    const character = createCharacter(tibia, { id: 'c9', name: 'X', classId: 'knight' });
    const xpTo20 = experienceForLevel(tibia, 20);
    const result = grantExperience(character, tibia, xpTo20);
    assert.equal(result.character.level, 20);
    assert.equal(result.unlockedPromotion, 'Cavaleiro de Elite');
  });

  it('rejeita XP negativa', () => {
    const character = createCharacter(tibia, { id: 'c10', name: 'X', classId: 'knight' });
    assert.throws(() => grantExperience(character, tibia, -5), RulesError);
  });

  it('calcula capacidade e peso carregado', () => {
    const character = createCharacter(tibia, { id: 'c11', name: 'X', classId: 'knight' });
    const status = carryStatus(character, tibia);
    assert.ok(status);
    assert.ok(status.capacity > 0);
    assert.ok(status.carried > 0);
  });
});

describe('testes de perícia', () => {
  it('escala o atributo conforme a regra da ambientação', () => {
    assert.equal(attributeBonus(tibia, 55), 5); // 'tenth'
    assert.equal(attributeBonus(requireSetting('cosmic-horror'), 55), 55); // 'flat'
    assert.equal(attributeBonus(requireSetting('space-opera'), 10), 5); // 'half'
  });

  it('classifica sucesso e falha pela margem', () => {
    const character = createCharacter(tibia, { id: 'c12', name: 'X', classId: 'knight' });
    const easy = performCheck({
      setting: tibia,
      character,
      attributeId: 'sword',
      difficulty: 1,
      seed: 'chk-easy',
      rolledBy: 'p1',
    });
    assert.ok(easy.outcome.degree === 'success' || easy.outcome.degree === 'critical-success');

    const impossible = performCheck({
      setting: tibia,
      character,
      attributeId: 'sword',
      difficulty: 500,
      seed: 'chk-hard',
      rolledBy: 'p1',
    });
    assert.ok(impossible.outcome.margin < 0);
  });

  it('vantagem mantém o maior de dois dados', () => {
    const character = createCharacter(tibia, { id: 'c13', name: 'X', classId: 'knight' });
    const result = performCheck({
      setting: tibia,
      character,
      attributeId: 'sword',
      difficulty: 10,
      seed: 'adv',
      rolledBy: 'p1',
      advantage: 'advantage',
    });
    assert.equal(result.roll.dice.length, 2);
    assert.equal(result.roll.dice.filter((d) => d.dropped).length, 1);
  });

  it('nomeia a dificuldade', () => {
    assert.equal(difficultyLabel(tibia, 14), 'Moderada');
    assert.equal(difficultyLabel(tibia, 100), 'Lendária');
  });
});

describe('combate', () => {
  const dragon = tibia.bestiary.find((b) => b.id === 'dragon')!;
  const healthId = healthVitalId(tibia);

  it('deriva vida do bestiário', () => {
    const combatant = combatantFromBestiary(dragon, 'm1');
    assert.equal(combatant.vitals.hp!.max, 1000);
    assert.equal(combatant.hostile, true);
  });

  it('armadura reduz mas nunca anula o dano', () => {
    const combatant = combatantFromBestiary(dragon, 'm1');
    const result = applyDamage(combatant, healthId, 5, 100);
    assert.equal(result.applied, 1, 'todo golpe que acerta tira ao menos 1');
  });

  it('marca "abatido" ao zerar a vida', () => {
    const combatant = combatantFromBestiary(dragon, 'm1');
    const result = applyDamage(combatant, healthId, 99999);
    assert.equal(result.combatant.vitals.hp!.current, 0);
    assert.ok(result.downed);
    assert.ok(result.combatant.conditions.includes('abatido'));
  });

  it('cura não ultrapassa o máximo e remove "abatido"', () => {
    const combatant = combatantFromBestiary(dragon, 'm1');
    const downed = applyDamage(combatant, healthId, 99999).combatant;
    const healed = applyHealing(downed, healthId, 99999);
    assert.equal(healed.combatant.vitals.hp!.current, 1000);
    assert.ok(!healed.combatant.conditions.includes('abatido'));
  });

  it('não muta o combatente original', () => {
    const combatant = combatantFromBestiary(dragon, 'm1');
    applyDamage(combatant, healthId, 500);
    assert.equal(combatant.vitals.hp!.current, 1000);
  });

  it('detecta vitória quando todos os hostis caem', () => {
    const hostile = applyDamage(combatantFromBestiary(dragon, 'm1'), healthId, 99999).combatant;
    const scene = {
      title: 't',
      description: 'd',
      combatants: [
        hostile,
        { id: 'pc', name: 'Herói', vitals: { hp: { current: 10, max: 10 } }, conditions: [], hostile: false },
      ],
      inCombat: true,
      turnOrder: [],
    };
    assert.equal(combatResolution(scene, healthId), 'victory');
  });
});
