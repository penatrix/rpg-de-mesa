/**
 * Inventário no formato que todo jogador de RPG de tela reconhece: um boneco
 * de equipamento com um slot por parte do corpo, e a mochila em grade logo
 * abaixo.
 *
 * A lista de texto que existia antes dizia o mesmo, mas dizia devagar — dava
 * para ler "Espada Serrilhada (equipado)" sem nunca perceber que o slot da
 * cabeça estava vazio. A grade mostra o vazio, que é a informação que faltava.
 */

import type { Character, ItemDef, ItemSlot, SettingDefinition } from '@rpg/shared';
import { EQUIPMENT_SLOTS, SLOT_LABELS, isEquippable } from '@rpg/shared';

import { useStore } from '../store.js';
import { ItemIcon } from './ItemIcon.js';

interface Entry {
  item: ItemDef;
  quantity: number;
  equipped: boolean;
}

function describe(item: ItemDef): string {
  const bits: string[] = [item.description];
  if (item.damage) bits.push(`Dano ${item.damage}`);
  if (item.armor) bits.push(`Armadura ${item.armor}`);
  if (item.attributeBonuses) {
    bits.push(
      Object.entries(item.attributeBonuses)
        .map(([id, value]) => `${id} ${value >= 0 ? `+${value}` : value}`)
        .join(', '),
    );
  }
  if (item.onUse) bits.push(`Ao usar: ${item.onUse.formula} de ${item.onUse.vitalId}`);
  bits.push(`Peso ${item.weight} · ${item.value} moedas · ${item.rarity}`);
  return bits.join('\n');
}

export function Inventory({
  character,
  setting,
  editable,
}: {
  character: Character;
  setting: SettingDefinition;
  editable: boolean;
}) {
  const updateCharacter = useStore((s) => s.updateCharacter);

  const entries: Entry[] = character.inventory.flatMap((held) => {
    const item = setting.items.find((i) => i.id === held.itemId);
    return item ? [{ item, quantity: held.quantity, equipped: held.equipped }] : [];
  });

  const equippedBySlot = new Map<ItemSlot, Entry>();
  for (const entry of entries) {
    if (entry.equipped && !equippedBySlot.has(entry.item.slot)) {
      equippedBySlot.set(entry.item.slot, entry);
    }
  }

  /**
   * Equipar troca o que estava no slot.
   *
   * Sem isso dá para andar com duas armaduras vestidas — o servidor aceita
   * qualquer inventário, então a regra de um item por slot vive aqui.
   */
  function setEquipped(itemId: string, equipped: boolean): void {
    if (!editable) return;
    const target = setting.items.find((i) => i.id === itemId);
    if (!target) return;

    void updateCharacter({
      ...character,
      inventory: character.inventory.map((held) => {
        if (held.itemId === itemId) return { ...held, equipped };
        if (!equipped) return held;
        const other = setting.items.find((i) => i.id === held.itemId);
        return other?.slot === target.slot ? { ...held, equipped: false } : held;
      }),
    });
  }

  const backpack = entries.filter((entry) => !entry.equipped);

  return (
    <>
      <h4>Equipamento</h4>
      <div className="equipment-doll">
        {EQUIPMENT_SLOTS.map((slot) => {
          const entry = equippedBySlot.get(slot);
          return (
            <button
              key={slot}
              type="button"
              className={`equip-slot ${entry ? 'filled' : ''}`}
              disabled={!entry || !editable}
              title={entry ? `${entry.item.name}\n\n${describe(entry.item)}` : SLOT_LABELS[slot]}
              onClick={() => entry && setEquipped(entry.item.id, false)}
            >
              {entry ? (
                <ItemIcon item={entry.item} size={30} />
              ) : (
                <span className="equip-slot-empty">{SLOT_LABELS[slot]}</span>
              )}
            </button>
          );
        })}
      </div>

      <h4>Mochila</h4>
      {backpack.length === 0 ? (
        <p className="small muted">Vazia.</p>
      ) : (
        <div className="backpack">
          {backpack.map((entry) => (
            <button
              key={entry.item.id}
              type="button"
              className="backpack-cell"
              disabled={!editable || !isEquippable(entry.item.slot)}
              title={`${entry.item.name}\n\n${describe(entry.item)}${
                isEquippable(entry.item.slot) ? '\n\nClique para equipar.' : ''
              }`}
              onClick={() => setEquipped(entry.item.id, true)}
            >
              <ItemIcon item={entry.item} size={30} />
              {entry.quantity > 1 && <span className="backpack-count">{entry.quantity}</span>}
              <span className="backpack-name">{entry.item.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
