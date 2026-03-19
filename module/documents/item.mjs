import { ETHERIA } from "../config.mjs";
import { DOC_SUB_TYPES } from "../constants.mjs";
import { DamageData } from "../data/shared/damage-field.mjs";
import DamageRoll from "../dice/damage-roll.mjs";

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
    if (!this.isOwner) return;

    const actions = this.system.getCardActions?.() ?? {};
    const keys = Object.keys(actions);

    const chatData = {
      type: DOC_SUB_TYPES.messages.item,
      flavor: `${this.actor.name} uses ${this.name}!`,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      system: {
        actions,
        item: { uuid: this.uuid, name: this.name, img: this.img },
      },
    };

    const msg =
      await foundry.documents.ChatMessage.implementation.create(chatData);

    if (keys.length === 1) await this[keys[0]]?.();

    return msg;
  }

  /**
   * Rolls the accuracy check for this item.
   * @returns {Promise<ChatMessage|void>} The created ChatMessage document
   */
  async rollAccuracy() {
    if (!this.isOwner) return;
    const rollData = this.getRollData() ?? {};

    const { attribute, metadata } = this.system;
    if (!metadata?.hasAccuracyRoll || !this.actor) return;
    
    let accFlavor = `Accuracy Check`;

    const terms = ["1d20", "+ @acc", "- @exh"];
    if (attribute) {
      const {abrr, label} = ETHERIA.attributes[attribute];
      terms.push(`+ @${abrr}.mod`);
      accFlavor = `${accFlavor} - (${label})`;
    }

    const dmgFlavor = `Damage Roll`;

    /**@type {DamageData[]} */
    const damages = Object.values(this.system.damages || {}) ?? [];
    const damagesRolls = damages.map((dmg) => {
      const dmgLabel = ETHERIA.damageTypes[dmg.type]?.label ?? dmg.type;
      const formula = dmg.type ? `${dmg.formula}[${dmgLabel}]` : dmg.formula;
      return DamageRoll.create(formula, rollData, { damageType: dmg.type, flavor: `${dmgFlavor} - (${dmgLabel})`});
    });

    const accRoll = foundry.dice.Roll.create(terms.join(" "), rollData, { flavor: accFlavor });
    foundry.documents.ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Accuracy Check</b> - ${this.name}`,
      type: DOC_SUB_TYPES.messages.accuracy,
      system: {
        "accuracy.rolls": [accRoll],
        "damages.rolls": damagesRolls,
        targets: game.user.targets.map((t) => t.document.uuid),
      },
    });
  }

  /**
   * Rolls the damages for this item.
   * @returns {Promise<ChatMessage|null>} TThe created ChatMessage document.
   */
  async rollDamages() {
    if (!this.isOwner) return;
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

    const CLS = foundry.documents.ChatMessage.implementation;
    return CLS.create({
      author: game.user.id,
      sound: CONFIG.sounds.dice,
      type: DOC_SUB_TYPES.messages.roll,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Damage Roll</b> - ${this.name}`,
      rolls,
    });
  }

  /**
   * Applies the effects of this item.
   * @returns {Promise<ChatMessage|null>} The created ChatMessage document.
   */
  async applyEffect() {
    if (!this.isOwner) return;
    const effects = this.getActionsEffect() ?? [];

    const selfEffects = effects.filter((ef) => ef.system.target === "self");
    const targetsEffects = effects.filter(
      (ef) => ef.system.target === "targets",
    );

    if (!selfEffects.length && !targetsEffects.length) {
      ui.notifications.warn(
        `Etheria | ${this.name} does not have a actions effects defined.`,
      );
      return null;
    }

    const CLS = foundry.documents.ChatMessage.implementation;
    return CLS.create({
      speaker: CLS.getSpeaker({ actor: this.actor }),
      type: DOC_SUB_TYPES.messages.effect,
      system: {
        effects: {
          self: selfEffects.filter((ef) => !ef.disabled).map((ef) => ef.uuid),
          target: targetsEffects
            .filter((ef) => !ef.disabled)
            .map((ef) => ef.uuid),
        },
        targets: game.user.targets.map((t) => t.document.uuid),
      },
    });
  }

  /**
   * Consumes the item uses and/or resources.
   * @returns {Promise<boolean>} True if consumption was successful or not required.
   */
  async consume() {
    if (!this.isOwner) return false;

    const updates = {};
    const actorUpdates = {};

    const uses = this.system.uses;
    if (uses && uses.value !== null && uses.max !== null) {
      if (uses.value <= 0) {
        ui.notifications.warn("Etheria | This item has no uses left.");
        return false;
      }
      updates["system.uses.value"] = (uses.value ?? 0) - 1;
    }

    const cost = this.system.cost;
    if (cost?.value && cost?.resource && this.actor) {
      const path = `system.${cost.resource}`;
      const resourceData = foundry.utils.getProperty(this.actor, path);

      let current = resourceData;
      let updatePath = path;

      // Handle object resource {value, max}
      if (
        foundry.utils.getType(resourceData) === "Object" &&
        "value" in resourceData
      ) {
        current = resourceData.value;
        updatePath = `${path}.value`;
      }

      if (typeof current !== "number") {
        ui.notifications.warn(
          `Etheria | Resource configuration for ${cost.resource} is invalid.`,
        );
        return false;
      }

      if (current < cost.value) {
        ui.notifications.warn(
          `Etheria | Not enough ${cost.resource} to use this item.`,
        );
        return false;
      }

      actorUpdates[updatePath] = current - cost.value;
    }

    const cardContent = [];
    if (!foundry.utils.isEmpty(updates)) {
      await this.update(updates);
      cardContent.push(
        ` <p>The ${this.actor.name} used a charge of ${this.name} Item.</p>`,
      );
    }
    if (!foundry.utils.isEmpty(actorUpdates)) {
      await this.actor.update(actorUpdates);
      const resourcesChoices = this.actor.system.getResourcesChoices();
      const resourceLabel = resourcesChoices[cost.resource];
      cardContent.push(
        ` <p>The ${this.actor.name} spent <b>${cost.value} ${resourceLabel}</b>.</p>`,
      );
    }

    if (cardContent.length) {
      const CLS = foundry.documents.ChatMessage.implementation;
      await CLS.create({
        speaker: CLS.getSpeaker({ actor: this.actor }),
        type: "base",
        content: `<div class="etheria-chat-card">
              <div class="card-content">
                  ${cardContent.join("")}
              </div>
          </div>`,
      });
    }

    return true;
  }
}
