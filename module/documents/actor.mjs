import EtheriaAbilitiesDialog from "../applications/dialog/abilities-dialog.mjs";
import { MODULE_ID, TEMPLATE_PATH } from "../constants.mjs";
import { ETHERIA } from "../config.mjs";
/**
 * @import { ResourceRecoveryResult } from "./_types.mjs";
 */

/**@type {typeof foundry.documents.Actor} */
const Actor = foundry.documents.Actor.implementation;

/**
 * The implementation for the Actor document
 * @extends {foundry.documents.Actor}
 */
export default class EtheriaActor extends Actor {
  /**@override */
  static get TYPES() {
    return super.TYPES.filter((k) => !["token", "chess"].includes(k));
  }

  /**
   * The cached instance of the abilities dialog.
   * @type {EtheriaAbilitiesDialog|null}
   */
  #abilitiesDialog;

  /**
   * Gets the abilities dialog instance.
   * @returns {EtheriaAbilitiesDialog}
   */
  get abilitiesDialog() {
    if (!this.#abilitiesDialog) {
      this.#abilitiesDialog = new EtheriaAbilitiesDialog({
        actor: this,
      });
    }
    return this.#abilitiesDialog;
  }

  /**@inheritdoc */
  getRollData() {
    return this.system.getRollData?.() ?? foundry.utils.deepClone(this.system);
  }

  /**
   * Recovers a specified character resource (stamina or mana) based on current recovery stats.
   * @param {'stamina'|'mana'} resourceKey - The key of the resource to recover.
   * @param {object} [options={}] - Additional options to modify recovery behavior.
   * @param {number} [options.multiplier=1] - A factor to scale the recovery amount.
   * @param {boolean} [options.silent=false] - If true, suppresses UI notifications.
   * @returns {Promise<ResourceRecoveryResult>}
   */
  async recoverResource(resourceKey, { multiplier = 1, silent = true } = {}) {
    const { resources, recovers, details, _source } = this.system;
    const resource = resources[resourceKey];
    /**@type {{mod: number; override: number; value: number}} */
    const recoveryAmount = recovers[resourceKey];

    const result = {
      success: false,
      diff: 0,
      newValue: resource?.value ?? 0,
    };

    if (!resource || !recoveryAmount || resource.value >= resource.max)
      return result;

    if (resourceKey === "mana" && !details.isCaster) {
      if (!silent)
        ui.notifications.warn("You do not have the ability to recover mana.");
      return result;
    }

    const currentValue = _source.resources[resourceKey].value;
    const appliedRecovery = recoveryAmount.value * multiplier;
    const newValue = Math.clamp(
      currentValue + appliedRecovery,
      0,
      resource.max,
    );

    const diff = newValue - currentValue;

    if (diff > 0) {
      Object.assign(result, {
        success: true,
        diff,
        newValue,
      });

      if (!silent)
        ui.notifications.info(
          `Etheria | ${this.name} recovered ${diff} ${resourceKey}.`,
        );

      await this.update({
        [`system.resources.${resourceKey}.value`]: newValue,
      });

      return result;
    }
  }

  /**
   * Do the end-of-round resource recovery for the actor.
   * @returns {Promise<ResourceRecoveryResult[]>}
   */
  async _applyRoundRecovery() {
    const existing = [];

    for (const effect of this.effects)
      if (effect.statuses.has("poison")) existing.push(effect.id);

    const multiplier = existing.length > 0 ? 0.5 : 1.0;
    return await Promise.all([
      this.recoverResource("stamina", { multiplier, silent: true }),
      this.recoverResource("mana", { multiplier, silent: true }),
    ]);
  }

  /**
   * Roll method for character rolls.
   * @param {string} attributeKey - The key for the attribute (e.g., 'strength' or 'str').
   */
  async rollAttribute(attributeKey) {
    const entry = Object.entries(CONFIG.ETHERIA.attributes).find(
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
  async rollSkill(skillKey) {
    const config = CONFIG.ETHERIA.skills[skillKey];
    const formula = `1d20 + @skills.${skillKey}.total + @bonus.accuracy - @exh`;
    const rollData = this.getRollData();

    const roll = foundry.dice.Roll.create(formula, rollData);

    const messageData = {
      flavor: `<b>Skill Check</b> - ${config.label}`,
      speaker: foundry.documents.ChatMessage.implementation.getSpeaker({
        actor: this,
      }),
    };

    return await roll.toMessage(messageData);
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
      speaker: foundry.documents.ChatMessage.implementation.getSpeaker({
        actor: this,
      }),
      flavor: `<b>Roll Advancement</b> - ${type.capitalize()}`,
    });

    return roll;
  }

  /**
   * Roll method for character defenses.
   * @param {keyof ETHERIA.defenses} defenseType - The key for the defense type.
   *                               This key is expected to exist in `ETHERIA.defenses` and `this.system.defenses`.
   * @returns {Promise<foundry.dice.Roll>} The evaluated Roll object.
   */
  async rollDefense(defenseType) {
    const config = CONFIG.ETHERIA.defenses[defenseType];
    if (!config) {
      ui.notifications.warn(
        `Etheria | Defense configuration not found for type: ${defenseType}`,
      );
      return;
    }

    const formula = `1d20 + @defense.${defenseType}.value`;
    const rollData = this.getRollData();

    const roll = foundry.dice.Roll.create(formula, rollData);
    await roll.evaluate();

    roll.toMessage({
      speaker: foundry.documents.ChatMessage.implementation.getSpeaker({
        actor: this,
      }),
      flavor: `<b>Defense Roll</b> - ${config.label}`,
    });

    return roll;
  }

  /**
   * Applies damage to the actor, reducing it by the actor's resistances.
   * @param {number} baseDamage - The initial amount of damage before resistances.
   * @param {keyof ETHERIA.damageTypes | keyof ETHERIA.healingTypes} damageType - The key of the damage type from `ETHERIA.damageTypes`.
   * @param {object} [options={}] - Optional parameters.
   * @param {boolean} [options.chatMessage=true] - Whether to create a chat message with the result.
   * @returns {Promise<{finalDamage: number, applied: boolean}>} An object containing the final damage and if it was applied.
   */
  async applyDamage(baseDamage, damageType, { chatMessage = true } = {}) {
    const results = await this.applyMultipleDamages(
      [{ value: baseDamage, type: damageType }],
      { chatMessage },
    );
    return results[0] || { finalDamage: 0, applied: false };
  }

  /**
   * Applies multiple instances of damage or healing simultaneously.
   * Processes all calculations and updates the database once.
   * @param {Array<{value: number, type: keyof ETHERIA.damageTypes | keyof ETHERIA.healingTypes}>} damageInstances - Array of damage objects containing value and type.
   * @param {object} [options={}] - Optional parameters.
   * @param {boolean} [options.chatMessage=true] - Whether to create chat messages for the results.
   * @returns {Promise<Array<{finalDamage: number, applied: boolean, type: string}>>} Array of results for each instance.
   */
  async applyMultipleDamages(damageInstances, { chatMessage = true } = {}) {
    if (!Array.isArray(damageInstances) || damageInstances.length === 0)
      return [];

    const { resistances = {}, resources = {} } = this.system;
    let currentHp = resources.hp?.value ?? 0;

    const results = [];
    let totalHpChange = 0;
    let chatContents = [];

    for (const instance of damageInstances) {
      const { value: baseDamage, type: damageType } = instance;

      if (baseDamage <= 0) {
        ui.notifications.warn(
          `Etheria | BaseDamage should have a value greater than 0: ${baseDamage} - ${damageType}`,
        );
        results.push({
          finalDamage: baseDamage,
          applied: false,
          type: damageType,
        });
        continue;
      }

      if (CONFIG.ETHERIA.healingTypes[damageType]) {
        // Handling heal individually since it likely has its own distinct logic/updates
        const healResult = await this.applyHeal(baseDamage, damageType, {
          chatMessage,
        });
        results.push({ ...healResult, type: damageType });
        continue;
      }

      const damageConfig = CONFIG.ETHERIA.damageTypes[damageType];
      if (!damageConfig) {
        ui.notifications.warn(
          `Etheria | Unknown damage type provided: ${damageType}`,
        );
        results.push({
          finalDamage: baseDamage,
          applied: false,
          type: damageType,
        });
        continue;
      }

      let armorValue = 0;
      let damageAfterArmor = baseDamage;

      if (!damageConfig.isMagic) {
        armorValue = resources.armor?.value ?? 0;
        damageAfterArmor = Math.max(0, baseDamage - armorValue);
      }

      const totalResistance = Math.clamp(
        (resistances[damageType] ?? 0) + (resistances.true ?? 0),
        0,
        100,
      );

      let finalDamage = Math.max(
        0,
        damageAfterArmor * (1 - totalResistance / 100),
      );

      if (finalDamage > 0) {
        totalHpChange += finalDamage;
      }

      results.push({ finalDamage, applied: finalDamage > 0, type: damageType });

      if (chatMessage) {
        const mathBreakdown =
          armorValue > 0
            ? `(${baseDamage} base - ${armorValue} armor) - ${totalResistance}% resisted`
            : `${baseDamage} base - ${totalResistance}% resisted`;

        chatContents.push(`
          <div class="etheria-damage-instance" style="margin-bottom: 0.5rem;">
            <p>Takes <strong>${finalDamage.toFixed(1)}</strong> ${damageConfig.label} damage.</p>
            <small style="display: block; opacity: 0.7;">(${mathBreakdown})</small>
          </div>
        `);
      }
    }

    if (totalHpChange > 0) {
      await this.update({
        "system.resources.hp.value": Math.max(0, currentHp - totalHpChange),
      });
    }

    // 5. Send combined chat message if instances were processed
    if (chatMessage && chatContents.length > 0) {
      const combinedContent = `
        <div class="etheria-chat-card">
          <strong>${this.name}</strong> receives damage:
          <hr style="margin: 0.25rem 0; opacity: 0.3;">
          ${chatContents.join("")}
        </div>`;

      /**@type {typeof foundry.documents.ChatMessage} */
      const CLS = foundry.documents.ChatMessage.implementation;
      await CLS.create({
        speaker: CLS.getSpeaker({ actor: this }),
        content: combinedContent,
      });
    }

    return results;
  }

  /**
   * Apply healing to this Actor and optionally create a chat message.
   * @param {number} baseHeal - The amount of healing to be applied.
   * @param {keyof ETHERIA.healingTypes} [healingType="heal"] - The key of the healing type configuration.
   * @param {object} [options={}] - Optional parameters.
   * @param {boolean} [options.chatMessage=true] - Whether to create a chat message with the result.
   * @returns {Promise<{finalHeal: number, applied: boolean, overflow: number}>} An object containing the final healing amount and if it was applied.
   * @protected
   */
  async applyHeal(baseHeal, healingType = "heal", { chatMessage = true } = {}) {
    const results = await this.applyMultipleHeals(
      [{ value: baseHeal, type: healingType }],
      { chatMessage },
    );
    return results[0] || { finalHeal: 0, applied: false, overflow: baseHeal };
  }

  /**
   * Applies multiple instances of healing simultaneously.
   * Processes all calculation logic together and updates the database once.
   * @param {Array<{value: number, type: string}>} healInstances - Array of healing objects containing value and type.
   * @param {object} [options={}] - Optional parameters.
   * @param {boolean} [options.chatMessage=true] - Whether to create chat messages for the results.
   * @returns {Promise<Array<{finalHeal: number, applied: boolean, overflow: number, type: string}>>} Array of results for each instance.
   */
  async applyMultipleHeals(healInstances, { chatMessage = true } = {}) {
    if (!Array.isArray(healInstances) || healInstances.length === 0) return [];

    const hp = this.system.resources.hp;
    const maxHp = hp.max ?? 0;
    // Track our sliding HP value during the loop calculations so subsequent instances handle remaining missing HP properly
    let runningHpValue = hp.value ?? 0;

    const results = [];
    let totalHpGained = 0;
    let chatContents = [];

    for (const instance of healInstances) {
      const { value: baseHeal, type: healingType } = instance;
      const healConfig = CONFIG.ETHERIA.healingTypes[healingType];

      const missingHp = Math.max(0, maxHp - runningHpValue);
      const finalHeal = Math.min(baseHeal, missingHp);
      const overflow = baseHeal - finalHeal;

      // Adjust running variables for tracking batch math
      runningHpValue += finalHeal;
      totalHpGained += finalHeal;

      results.push({
        finalHeal,
        applied: finalHeal > 0,
        overflow,
        type: healingType,
      });

      // Queue up Chat Message content for this specific instance
      if (chatMessage) {
        const label = healConfig?.label ?? healingType;
        let instanceHtml = `
          <div class="etheria-heal-instance" style="margin-bottom: 0.5rem;">
            <p>Receives <strong>${finalHeal}</strong> ${label} points.</p>
        `;

        if (overflow > 0) {
          instanceHtml += `<small style="display: block; opacity: 0.7;">(${overflow} healing exceeded max HP)</small>`;
        }
        instanceHtml += `</div>`;

        chatContents.push(instanceHtml);
      }
    }

    // 1. Single Database Update for all combined healing changes
    if (totalHpGained > 0) {
      await this.update({
        "system.resources.hp.value": Math.min(
          maxHp,
          (hp.value ?? 0) + totalHpGained,
        ),
      });
    }

    // 2. Send combined chat card if instances were processed
    if (chatMessage && chatContents.length > 0) {
      const combinedContent = `
        <div class="etheria-chat-card">
          <strong>${this.name}</strong> receives healing:
          <hr style="margin: 0.25rem 0; opacity: 0.3;">
          ${chatContents.join("")}
        </div>`;

      /**@type {typeof foundry.documents.ChatMessage} */
      const CLS = foundry.documents.ChatMessage.implementation;
      await CLS.create({
        speaker: CLS.getSpeaker({ actor: this }),
        content: combinedContent,
      });
    }

    return results;
  }

  /**
   * Opens the Abilities dialog, filtering for items of type 'ability'.
   * @returns {Promise<Application>}
   */
  async openAbilitiesDialog() {
    const dialog = this.abilitiesDialog;
    return await dialog.render({ force: true });
  }

  /**
   * Opens the Secondaries (Skills) dialog.
   * @returns {Promise<Application>}
   */
  async openSecondariesDialog() {
    const skills = Object.entries(this.system.skills).reduce(
      (acc, [key, data]) => {
        const attributeKey = CONFIG.ETHERIA.skills[key].attribute;
        acc[attributeKey] ??= {
          label: CONFIG.ETHERIA.attributes[attributeKey]?.label,
          skills: {},
        };
        acc[attributeKey].skills[key] = {
          label: CONFIG.ETHERIA.skills[key].label,
          total: data.total,
        };
        return acc;
      },
      {},
    );

    const content = await foundry.applications.handlebars.renderTemplate(
      `${TEMPLATE_PATH}/dialogs/skill-dialog.hbs`,
      {
        actor: this,
        secondaries: skills,
      },
    );

    const skillsIds =
      (await foundry.applications.api.Dialog.wait({
        rejectClose: false,
        classes: [MODULE_ID, "skills-dialog"],
        window: {
          title: `${this.name}: Skills`,
          icon: "fa-solid fa-bolt-lightning",
        },
        position: {
          height: 500,
        },
        content,
        render: (_event, dialog) => {
          dialog.element.querySelectorAll(".selectable-skill").forEach((el) => {
            el.addEventListener("click", (ev) => {
              const checkbox = ev.currentTarget
                .closest(".selectable-skill")
                .querySelector('input[type="checkbox"]');
              checkbox.checked = !checkbox.checked;
            });
          });
        },
        buttons: [
          {
            label: "Roll",
            icon: "fa-solid fa-bolt-lightning",
            action: "use",
            class: "etheria-button",
            callback: (_event, button, _dialog) => {
              const formData = new foundry.applications.ux.FormDataExtended(
                button.form,
              ).object;
              return Object.keys(formData).filter((k) => formData[k]);
            },
          },
        ],
      })) ?? [];

    return await Promise.all(
      skillsIds.map((skillId) => this.rollSkill(skillId)),
    );
  }
}
