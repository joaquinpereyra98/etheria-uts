import { ETHERIA } from "../config.mjs";
import { DOC_SUB_TYPES } from "../constants.mjs";
import { DamageData } from "../data/shared/damage-field.mjs";

export default class EtheriaItem extends foundry.documents.Item.implementation {
  /**@inheritdoc */
  static getDefaultArtwork(itemData = {}) {
    const img =
      CONFIG.Item.dataModels[itemData.type]?.metadata?.img ??
      foundry.documents.Item.implementation.DEFAULT_ICON;

    return { img };
  }

  /**
   * Get effects triggered by an action
   * @returns {foundry.documents.ActiveEffect[]}
   */
  getActionsEffect() {
    return this.effects.filter((ef) => !!ef.system.isAction);
  }

  /**
   * Use the item.
   * @returns {Promise<ChatMessage>} The created ChatMessage document.
   */
  async use() {
    const actions = this.system.getCardActions?.() ?? {};
    const chatData = {
      type: DOC_SUB_TYPES.messages.item,
      flavor: `${this.actor.name} uses ${this.name}!`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      system: {
        item: {
          uuid: this.uuid,
          name: this.name,
          img: this.img,
        },
        actions,
      },
    };
    const keys = Object.keys(actions);
    if (keys.length === 1) {
      const msg = await foundry.documents.ChatMessage.create(chatData);
      await this[keys[0]]?.();
      return msg;
    } else {
      return foundry.documents.ChatMessage.create(chatData);
    }
  }

  /**
   * Rolls the accuracy check for this item.
   * @returns {Promise<ChatMessage|void>} The created ChatMessage document
   */
  async rollAccuracy() {
    const { Roll } = foundry.dice;
    const rollData = this.getRollData();

    const { attribute, metadata } = this.system;
    if (!metadata?.hasAccuracyRoll || !this.actor) return;

    const terms = ["1d20", "+ @acc", "- @exh"];
    if (attribute) {
      const attr = ETHERIA.attributes[attribute].abrr;
      terms.push(`@${attr}.mod`);
    }

    /**@type {DamageData[]} */
    const damages = Object.values(this.system.damages || {}) ?? [];
    const damagesRolls = damages.map((dmg) => {
      const fomula = dmg.type ? `${dmg.formula}[${dmg.type}]` : dmg.formula;
      return Roll.create(fomula, rollData);
    });

    const accRoll = Roll.create(terms.join(" "), rollData);

    foundry.documents.ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Accuracy Check</b> - ${this.name}`,
      type: DOC_SUB_TYPES.messages.accuracy,
      system: {
        "accuracy.rolls": [accRoll],
        "damages.rolls": damagesRolls,
      },
    });
  }

  /**
   * Rolls the damages for this item.
   * @returns {Promise<ChatMessage|null>} TThe created ChatMessage document.
   */
  async rollDamages() {
    /**@type {DamageData[]} */
    const damages = Object.values(this.system.damages || {}) ?? [];

    if (!this.system.hasOwnProperty("damages") || damages.length === 0) {
      ui.notifications.warn(
        `Etheria | ${this.name} does not have a damages formulas defined.`,
      );
      return null;
    }

    const rollData = this.getRollData();
    const { Roll } = foundry.dice;

    const rolls = await Promise.all(
      damages.map((dmg) => {
        const fomula = dmg.type ? `${dmg.formula}[${dmg.type}]` : dmg.formula;
        return Roll.create(fomula, rollData).evaluate();
      }),
    );

    const cls = foundry.utils.getDocumentClass("ChatMessage");
    return cls.create({
      author: game.user.id,
      sound: CONFIG.sounds.dice,
      type: DOC_SUB_TYPES.messages.roll,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Damage Roll</b> - ${this.name}`,
      rolls,
    });
  }
}
