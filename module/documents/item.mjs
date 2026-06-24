import EtheriaEquippedItemsDialog from "../applications/dialog/equipped-item.mjs";
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

  get hasDamage() {
    const damages = Object.values(this.system.damages || {});
    return damages.length !== 0;
  }

  /**@inheritdoc */
  getRollData() {
    const data = this.parent?.getRollData() ?? {};
    data.item = { ...this.system };
    return data;
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

  async _createAccuracyMessage({ messageData = {} } = {}) {
    const { metadata } = this.system;
    if (!this.isOwner || !this.actor || !metadata?.hasAccuracyRoll) return;

    const ChatMessage = foundry.documents.ChatMessage.implementation;
    return await ChatMessage.create(
      foundry.utils.mergeObject(
        {
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: `<b>Accuracy Check</b> - ${this.name}`,
          type: DOC_SUB_TYPES.messages.accuracy,
          system: {
            itemUuid: this.uuid,
            targets: game.user.targets.map((t) => t.document.uuid),
            hasDamage: this.hasDamage,
          },
        },
        messageData,
      ),
    );
  }

  /**
   * Rolls the accuracy check for this item.
   * @returns {Promise<ChatMessage|void>} The created ChatMessage document
   */
  async rollAccuracy({ createMessage = true, rollData } = {}) {
    const { attribute, metadata } = this.system;
    if (!this.isOwner || !this.actor || !metadata?.hasAccuracyRoll) return;

    rollData ??= this.getRollData() ?? {};

    let accFlavor = `Accuracy Check`;
    const terms = ["1d20", "+ @acc", "- @exh"];

    if (attribute) {
      const { abbr, label } = CONFIG.ETHERIA.attributes[attribute] ?? {};
      if (abbr) terms.push(`+ @${abbr}.mod`);
      if (label) accFlavor = `${accFlavor} - (${label})`;
    }

    const accRoll = foundry.dice.Roll.create(terms.join(" "), rollData, {
      flavor: accFlavor,
    });
    await accRoll.evaluate();

    if(createMessage) {
      return await this._createAccuracyMessage({
        "accuracy.rolls": [accRoll],
      });
    } else {
      return [accRoll];
    }
  }

  /**
   * Rolls the damages for this item.
   * @param {object} [options={}] - Options to modify the rolling behavior.
   * @param {boolean} [options.createMessage=true] - Whether to automatically create a ChatMessage document.
   * @param {object} [options.rollData] - Optional custom roll data to override the default.
   * @param {string} [options.flavor] - Optional custom flavor text for the chat message.
   * @returns {Promise<Roll[]|ChatMessage|null>}
   */
  async rollDamages({ createMessage = true, rollData, flavor } = {}) {
    if (!this.isOwner) return null;

    const damages = Object.values(this.system.damages || {});
    if (damages.length === 0) {
      ui.notifications.warn(
        `Etheria | ${this.name} does not have any damage formulas defined.`,
      );
      return null;
    }

    rollData ??= this.getRollData() ?? {};

    const rollsRaw = await Promise.all(
      damages.map(async (dmg) => {
        if (dmg.type === "equippedItem") {
          const item = await this._getEquippedItem();
          if (!item) return null;
          return await item.rollDamages({ createMessage: false, rollData });
        }
        const dmgLabel =
          CONFIG.ETHERIA.damageTypes[dmg.type]?.label ?? dmg.type;
        const formula = dmg.type ? `${dmg.formula}` : dmg.formula;
        return await DamageRoll.create(formula, rollData, {
          damageType: dmg.type,
          flavor: `Damage Roll - (${dmgLabel})`,
        }).evaluate();
      }),
    );

    const rolls = rollsRaw.flat(Infinity).filter(Boolean);
    if (!createMessage) return rolls;

    const ChatMessage = foundry.documents.ChatMessage.implementation;
    return await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      author: game.user.id,
      sound: CONFIG.sounds.dice,
      type: DOC_SUB_TYPES.messages.roll,
      flavor: flavor ?? `<b>Damage Roll</b> - ${this.name}`,
      rolls,
    });
  }

  /**
   * Retrieves the equipped item to fetch damage formulas from.
   * @returns {Promise<Item|null>}
   * @private
   */
  async _getEquippedItem() {
    if (!this.actor) return null;

    const { ability, race } = DOC_SUB_TYPES.items;
    const equippedItems = this.actor.items.filter(
      (i) => ![ability, race].includes(i.type) && i.system.equipped,
    );

    if (equippedItems.length === 0) return null;
    if (equippedItems.length === 1) return equippedItems[0];

    return await EtheriaEquippedItemsDialog.create({ actor: this.actor });
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
      const path = cost.resource;
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
