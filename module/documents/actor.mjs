import { ETHERIA } from "../config.mjs";

/**@type {typeof foundry.documents.Actor} */
const Cls = foundry.documents.Actor.implementation;

export default class EtheriaActor extends Cls {
  /**@override */
  static get TYPES() {
    return super.TYPES.filter((k) => !["token", "chess"].includes(k));
  }

  /**@inheritdoc */
  getRollData() {
    return this.system.getRollData?.() ?? foundry.utils.deepClone(this.system);
  }

  /**
   * Roll method for character rolls.
   * @param {string} attributeKey - The key for the attribute (e.g., 'strength' or 'str').
   */
  async rollAttributesCheck(attributeKey) {
    const entry = Object.entries(ETHERIA.attributes).find(
      ([k, v]) =>
        k === attributeKey.toLowerCase() ||
        v.abrr === attributeKey.toLowerCase(),
    );

    const [_, config] = entry;
    const formula = `1d20 + @${config.abrr}.mod + @bonus.accuracy - (@exhaustion * 3)`;

    const rollData = this.getRollData();

    const roll = foundry.dice.Roll.create(formula, rollData);
    await roll.evaluate();

    roll.toMessage({
      speaker: foundry.documents.ChatMessage.implementation.getSpeaker({
        actor: this,
      }),
      flavor: `<b>Attribute Check</b> - ${config.label}`,
    });

    return roll;
  }

  /**
   * Roll method for character rolls.
   * @param {keyof ETHERIA.skills} skillKey - The key for the skill
   */
  async rollSkillCheck(skillKey) {
    const config = ETHERIA.skills[skillKey];
    const formula = `1d20 + @skills.${skillKey}.total + @bonus.accuracy - (@exhaustion * 3)`;
    const rollData = this.getRollData();

    const roll = foundry.dice.Roll.create(formula, rollData);
    await roll.evaluate();

    roll.toMessage({
      speaker: foundry.documents.ChatMessage.implementation.getSpeaker({
        actor: this,
      }),
      flavor: `<b>Skill Check</b> - ${config.label}`,
    });

    return roll;
  }

  /**
   * @param {"health"|"resource"} type
   */
  async rollAdvancement(type) {
    const formula = this.system.advancementRoll[type];
    if (!formula) return;
    const rollData = this.getRollData();
    const roll = foundry.dice.Roll.create(formula, rollData);
    await roll.evaluate();

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `<b>Roll Advancement</b> - ${type.capitalize()}`,
    });

    return roll;
  }
}
