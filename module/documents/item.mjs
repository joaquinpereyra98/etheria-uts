import EtheriaEquippedItemsDialog from "../applications/dialog/equipped-item.mjs";
import { DOC_SUB_TYPES } from "../constants.mjs";
import DamageRoll from "../dice/damage-roll.mjs";
import simplifyRollFormula from "../dice/simplify-roll-formula.mjs";

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

    const actionType = this.system.actionType;
    const actionFlavor =
      actionType && this.parent?.isOwner
        ? await this.parent.consumeAction(actionType)
        : "";

    const actions = this.system.getCardActions?.() ?? {};
    const keys = Object.keys(actions);

    let flavor = `${this.actor.name} uses ${this.name}!`;
    if (actionFlavor) flavor += ` <p class="hint">${actionFlavor}</p>`;

    const chatData = {
      type: DOC_SUB_TYPES.messages.item,
      flavor,
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

    const u = !game.user.isGM
      ? game.user
      : (game.users.getDesignatedUser(
          (u) =>
            u.active &&
            !u.isGM &&
            this.actor.testUserPermission(game.user, "OWNER"),
        ) ?? game.user);

    return await ChatMessage.create(
      foundry.utils.mergeObject(
        {
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: `<b>Accuracy Check</b> - ${this.name}`,
          type: DOC_SUB_TYPES.messages.accuracy,
          system: {
            itemUuid: this.uuid,
            targets: u?.targets.map((t) => t.document.uuid),
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

    if (this.system.isSpell) {
      const spheresMods = this.system.spheres.map(
        (k) => `+ @magicSpheres.${k}`,
      );
      terms.push(...spheresMods);
    }

    const accFormula = simplifyRollFormula(
      foundry.dice.Roll.defaultImplementation.replaceFormulaData(
        terms.join(" "),
        rollData,
      ),
    );
    const accRoll = foundry.dice.Roll.create(accFormula, rollData, {
      flavor: accFlavor,
    });
    await accRoll.evaluate();

    if (createMessage) {
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
   * @param {boolean} [options.maximize] - Maximize the result, obtaining the largest possible value
   * @returns {Promise<foundry.dice.Roll[]|ChatMessage|null>}
   */
  async rollDamages({ createMessage = true, rollData, flavor, maximize } = {}) {
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
          return item
            ? item.rollDamages({ createMessage: false, rollData })
            : null;
        }

        const spheresMods = this.system.isSpell
          ? this.system.spheres.map((k) => `@magicSpheres.${k}`)
          : [];

        const formula = simplifyRollFormula(
          foundry.dice.Roll.defaultImplementation.replaceFormulaData(
            [dmg.formula, ...spheresMods].join(" + "),
            rollData,
          ),
        );

        const dmgLabel =
          CONFIG.ETHERIA.damageTypes[dmg.type]?.label ?? dmg.type;

        return DamageRoll.create(formula, rollData, {
          damageType: dmg.type,
          flavor: `Damage Roll - (${dmgLabel})`,
          maximize,
        }).evaluate({ maximize });
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
    const item = this;
    if (!item?.isOwner) return false;

    const updates = {};
    const cardContent = [];

    const uses = this.uses;
    if (uses && uses.max > 0) {
      if (uses.value <= 0) {
        ui.notifications.warn(`Etheria | ${item.name} has no uses left.`);
        return false;
      }
      updates["system.uses.value"] = Math.max(0, uses.value - 1);
      cardContent.push(
        `<p>The ${item.actor.name} used a charge of ${item.name}.</p>`,
      );
    }

    const evaluatedCosts = this._evaluateCosts();
    const actorUpdates = this._getActorCostUpdates(evaluatedCosts);

    if (actorUpdates === false) return false; //

    if (evaluatedCosts.length > 0) {
      const spentItems = [];
      for (const { totalCost, config, label } of evaluatedCosts) {
        const iconClass = config.icon || "";
        const content = Handlebars.partials.costPart(
          {
            icon: iconClass,
            color: config.color,
            totalCost,
            label,
          },
          {
            allowProtoMethodsByDefault: true,
            allowProtoPropertiesByDefault: true,
          },
        );
        spentItems.push(content);
      }
      if (spentItems.length > 0) {
        cardContent.push(`
          <p>The ${item.actor.name} spent:</p>
          <ul>
            ${spentItems.map((c) => `<li>${c}</li>`).join("")}
          </ul>
        `);
      }
    }

    if (!foundry.utils.isEmpty(updates)) {
      await item.update(updates);
    }
    if (!foundry.utils.isEmpty(actorUpdates)) {
      await item.actor.update(actorUpdates);
    }

    if (cardContent.length) {
      const CLS = foundry.documents.ChatMessage.implementation;
      await CLS.create({
        speaker: CLS.getSpeaker({ actor: item.actor }),
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

  /**
   * Evaluates resource cost formulas, gathers config data, and returns compiled details.
   * @returns {Array<{cost: Object, totalCost: number, config: Object, label: string}>}
   * @private
   */
  _evaluateCosts() {
    const costs = Object.values(this.system.costs || {}).filter(
      (c) => c.value && c.resource,
    );
    if (!costs.length || !this.actor) return [];

    const evaluatedCosts = [];
    const resourcesChoices = this.actor.system.getResourcesChoices?.() ?? {};

    for (const cost of costs) {
      let totalCost = 0;
      try {
        totalCost = foundry.dice.Roll.create(
          cost.value,
          this.getRollData(),
        ).evaluateSync().total;
      } catch (err) {
        console.error(
          `Etheria | Failed to evaluate cost formula: ${cost.value}`,
          err,
        );
        continue;
      }

      if (totalCost <= 0) continue;

      const resourceKey = cost.resource.split(".").pop();
      const config = CONFIG.ETHERIA.resources[resourceKey] ?? {
        color: "currentColor",
        icon: "fa-regular fa-stars",
      };

      const label = resourcesChoices[cost.resource] ?? cost.resource;

      evaluatedCosts.push({ cost, totalCost, config, label });
    }

    return evaluatedCosts;
  }

  /**
   * Validates actor balances and calculates resource updates based on pre-evaluated costs.
   * @param {Array<Object>} evaluatedCosts - The array of evaluated costs from _evaluateCosts().
   * @returns {Object|false}
   * @private
   */
  _getActorCostUpdates(evaluatedCosts) {
    const actorUpdates = {};
    if (!evaluatedCosts.length) return { actorUpdates };

    for (const { cost, totalCost, config, label } of evaluatedCosts) {
      const currentResourceValue = foundry.utils.getProperty(
        this.actor,
        `${cost.resource}.value`,
      );

      if (currentResourceValue === undefined) {
        ui.notifications.error(
          `Etheria | Actor is missing the resource: ${cost.resource}`,
        );
        return false;
      }

      if (currentResourceValue < totalCost) {
        ui.notifications.warn(
          `Etheria | Not enough ${label} to use ${this.name}. Required: ${totalCost}, Have: ${currentResourceValue}`,
        );
        return false;
      }

      actorUpdates[`${cost.resource}.value`] = currentResourceValue - totalCost;
    }

    return { actorUpdates };
  }

  /**
   * Helper to process resource costs, validate actor balances, and generate updates/HTML strings.
   * @returns { {actorUpdates: Object, spentItems: string[]} | false } Returns false if validation fails.
   */
  _getCostsCostUpdates() {
    const actorUpdates = {};
    const spentItems = [];

    const costs = Object.values(this.system.costs || {}).filter(
      (c) => c.value && c.resource,
    );
    if (!costs.length || !this.actor) return { actorUpdates, spentItems };

    const actorSystem = this.actor.system;
    const resourcesChoices = actorSystem.getResourcesChoices?.() ?? {};

    for (const cost of costs) {
      let totalCost = 0;
      try {
        totalCost = foundry.dice.Roll.create(
          cost.value,
          this.getRollData(),
        ).evaluateSync().total;
      } catch (err) {
        console.error(
          `Etheria | Failed to evaluate cost formula: ${cost.value}`,
          err,
        );
        continue;
      }

      if (totalCost <= 0) continue;

      const currentResourceValue = foundry.utils.getProperty(
        this.actor,
        `${cost.resource}.value`,
      );

      if (currentResourceValue === undefined) {
        ui.notifications.error(
          `Etheria | Actor is missing the resource: ${cost.resource}`,
        );
        return false;
      }

      if (currentResourceValue < totalCost) {
        const label = resourcesChoices[cost.resource] ?? cost.resource;
        ui.notifications.warn(
          `Etheria | Not enough ${label} to use ${this.name}. Required: ${totalCost}, Have: ${currentResourceValue}`,
        );
        return false;
      }

      actorUpdates[`${cost.resource}.value`] = currentResourceValue - totalCost;

      const resourceKey = cost.resource.split(".").pop();
      const config = CONFIG.ETHERIA.resources[resourceKey] ?? {
        color: "currentColor",
        icon: "fa-regular fa-stars",
      };

      const resourceLabel = resourcesChoices[cost.resource] ?? cost.resource;

      const iconClass = config.icon || "";
      const content = `<span style="text-shadow: 0px 0px 2px ${config.color};">
          <i class="${iconClass}" style="color: ${config.color};"></i>
          <span class="value">${totalCost}</span>
          <span class="resource">${resourceLabel}</span>
        </span>`;

      spentItems.push(content);
    }

    return { actorUpdates, spentItems };
  }
}
