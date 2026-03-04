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
        actions: this.system.getCardActions?.(),
      },
    };

    return foundry.documents.ChatMessage.create(chatData);
  }

  /**
   * Rolls the accuracy check for this item.
   * @returns {Promise<ChatMessage|void>} The created ChatMessage document
   */
  async rollAccuracy() {
    const { attribute, metadata } = this.system;
    if (!metadata?.hasAccuracyRoll || !this.actor) return;

    const terms = ["1d20", "@bonus.accuracy", "-(@exhaustion * 3)"];
    if (attribute) terms.push(`@${attribute}.mod`);

    const formula = terms.join(" + ");

    foundry.documents.ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Accuracy Check</b> - ${this.name}`,
      type: DOC_SUB_TYPES.messages.accuracy,
    })

    /*
    const rollData = this.getRollData();

    const roll = foundry.dice.Roll.create(formula, rollData);
    await roll.evaluate();

    return roll.toMessage({
      
    });
    */
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
