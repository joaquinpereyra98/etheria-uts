import { ETHERIA } from "../config.mjs";
import { DOC_SUB_TYPES, MODULE_ID, TEMPLATE_PATH } from "../constants.mjs";

const Cls = foundry.documents.Actor.implementation;

/**
 * The implementation for the Actor document
 * @extends {foundry.documents.Actor}
 */
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
   * Recovers a specified character resource (stamina or mana) based on current recovery stats.
   * @param {'stamina'|'mana'} resourceKey - The key of the resource to recover.
   * @returns {Promise<void>}
   */
  async recoverResource(resourceKey) {
    const { resources, recovers, details, _source } = this.system;
    const resource = resources[resourceKey];
    const recoveryAmount = recovers[resourceKey];

    if (!resource || !recoveryAmount || resource.value >= resource.max) return;

    if (resourceKey === "mana" && !details.isCaster) {
      return ui.notifications.warn(
        "You do not have the ability to recover mana.",
      );
    }

    const currentValue = _source.resources[resourceKey].value;
    const newValue = Math.clamp(currentValue + recoveryAmount, 0, resource.max);

    const diff = newValue - currentValue;

    if (diff > 0) {
      ui.notifications.info(`Etheria | ${this.name} recovered ${diff} ${resourceKey}.`);

      return this.update({
        [`system.resources.${resourceKey}.value`]: newValue,
      });
    }
  }

  /**
   * Roll method for character rolls.
   * @param {string} attributeKey - The key for the attribute (e.g., 'strength' or 'str').
   */
  async rollAttribute(attributeKey) {
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
  async rollSkill(skillKey) {
    const config = ETHERIA.skills[skillKey];
    const formula = `1d20 + @skills.${skillKey}.total + @bonus.accuracy - (@exhaustion * 3)`;
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
    const config = ETHERIA.defenses[defenseType];
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
   * @param {keyof ETHERIA.damageTypes} damageType - The key of the damage type from `ETHERIA.damageTypes`.
   * @param {object} [options={}] - Optional parameters.
   * @param {boolean} [options.chatMessage=true] - Whether to create a chat message with the result.
   * @returns {Promise<{finalDamage: number, applied: boolean}>} An object containing the final damage and if it was applied.
   */
  async applyDamage(baseDamage, damageType, { chatMessage = true } = {}) {
    if (ETHERIA.healingTypes[damageType]) {
      return await this.applyHeal(baseDamage, damageType, { chatMessage });
    }

    const damageConfig = ETHERIA.damageTypes[damageType];
    if (!damageConfig) {
      ui.notifications.warn(
        `Etheria | Unknown damage type provided: ${damageType}`,
      );
      return { finalDamage: baseDamage, applied: false };
    }

    const resistances = this.system.resistances ?? {};
    const specificResistance = resistances[damageType]?.value ?? 0;
    const allResistance = resistances.all?.value ?? 0;
    const totalResistance = specificResistance + allResistance;

    const finalDamage = Math.max(0, baseDamage - totalResistance);

    if (finalDamage > 0) {
      const currentHp = this.system.resources.hp.value;
      await this.update({
        "system.resources.hp.value": currentHp - finalDamage,
      });
    }

    if (chatMessage) {
      const content = `
        <div class="etheria-chat-card">
          <p><strong>${this.name}</strong> takes <strong>${finalDamage}</strong> ${damageConfig.label} damage.</p>
          <small style="display: block; opacity: 0.7;">(${baseDamage} base - ${totalResistance} resisted)</small>
        </div>`;
      /**@type {typeof foundry.documents.ChatMessage} */
      const CLS = foundry.documents.ChatMessage.implementation;
      await CLS.create({
        speaker: CLS.getSpeaker({ actor: this }),
        content: content,
      });
    }

    return { finalDamage, applied: finalDamage > 0 };
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
    const healConfig = ETHERIA.healingTypes[healingType];
    const hp = this.system.resources.hp;

    const missingHp = Math.max(0, hp.max - hp.value);
    const finalHeal = Math.min(baseHeal, missingHp);
    const overflow = baseHeal - finalHeal;

    await this.update({ "system.resources.hp.value": hp.value + finalHeal });

    if (chatMessage) {
      const label = healConfig?.label ?? healingType;
      let content = `
        <div class="etheria-chat-card">
          <p><strong>${this.name}</strong> receives <strong>${finalHeal}</strong> ${label} points.</p>
      `;

      if (overflow > 0) {
        content += `<small style="display: block; opacity: 0.7;">(${overflow} healing exceeded max HP)</small>`;
      }

      content += `</div>`;

      /**@type {typeof foundry.documents.ChatMessage} */
      const CLS = foundry.documents.ChatMessage.implementation;
      await CLS.create({
        speaker: CLS.getSpeaker({ actor: this }),
        content,
      });
    }

    return { finalHeal, applied: finalHeal > 0, overflow };
  }

  /**
   * Opens the Abilities dialog, filtering for items of type 'ability'.
   * @returns {Promise<Application>}
   */
  async openAbilitiesDialog() {
    const abilities = this.itemTypes[DOC_SUB_TYPES.items.ability].toSorted(
      (a, b) => a.name.localeCompare(b.name),
    );

    const content = await foundry.applications.handlebars.renderTemplate(
      `${TEMPLATE_PATH}/dialogs/abilities-dialog.hbs`,
      { actor: this, abilities },
    );

    const selectedIds =
      (await foundry.applications.api.Dialog.wait({
        window: {
          title: `${this.name}: Abilities`,
          icon: "fa-solid fa-meteor",
        },
        classes: [MODULE_ID, "abilities-dialog"],
        content,
        render: (_, dialog) => {
          dialog.element.addEventListener("click", async (ev) => {
            const btn = ev.target.closest(
              "[data-ability-uuid], .selectable-ability",
            );
            if (!btn) return;

            if (btn.dataset.abilityUuid) {
              ev.stopPropagation();
              const doc = await fromUuid(btn.dataset.abilityUuid);
              return doc?.sheet.render(true);
            }
            btn.classList.toggle("active");
          });
        },
        buttons: [
          {
            label: "Use",
            icon: "fa-solid fa-fire-flame-curved",
            action: "use",
            callback: (_, __, dialog) =>
              Array.from(
                dialog.element.querySelectorAll(".selectable-ability.active"),
                (el) => el.dataset.abilityId,
              ),
          },
        ],
        rejectClose: false,
      })) ?? [];

    for (const id of selectedIds)
      await abilities.find((a) => a.id === id)?.use();
  }

  /**
   * Opens the Secondaries (Skills) dialog.
   * @returns {Promise<Application>}
   */
  async openSecondariesDialog() {
    const skills = Object.entries(this.system.skills).reduce(
      (acc, [key, data]) => {
        const attributeKey = ETHERIA.skills[key].attribute;
        acc[attributeKey] ??= {
          label: ETHERIA.attributes[attributeKey]?.label,
          skills: {},
        };
        acc[attributeKey].skills[key] = {
          label: ETHERIA.skills[key].label,
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
      skillsIds.map((skillId) => this.rollSkillCheck(skillId)),
    );
  }
}
