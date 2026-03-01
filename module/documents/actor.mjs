import { ETHERIA } from "../config.mjs";
import { DOC_SUB_TYPES, MODULE_ID, TEMPLATE_PATH } from "../constants.mjs";

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

  /**
   * Opens the Abilities dialog, filtering for items of type 'ability'.
   * @returns {Promise<Application>}
   */
  async openAbilitiesDialog() {
    const abilities = this.itemTypes[DOC_SUB_TYPES.items.ability];

    const content = await foundry.applications.handlebars.renderTemplate(
      `${TEMPLATE_PATH}/dialogs/abilities-dialog.hbs`,
      {
        actor: this,
        abilities: abilities.sort((a, b) => a.name.localeCompare(b.name)),
      },
    );

    const abilitiesIds =
      (await foundry.applications.api.Dialog.wait({
        rejectClose: false,
        classes: [MODULE_ID, "abilities-dialog"],
        window: {
          title: `${this.name}: Abilities`,
          icon: "fa-solid fa-meteor",
        },
        content,
        render: (_event, dialog) => {
          dialog.element
            .querySelectorAll(".selectable-ability")
            .forEach((el) => {
              el.addEventListener("click", (ev) => {
                ev.currentTarget.classList.toggle("active");
              });
            });
          dialog.element.querySelectorAll(".open-doc").forEach((el) => {
            el.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              const doc = await foundry.utils.fromUuid(
                ev.currentTarget.dataset.abilityUuid,
              );
              doc.sheet.render({ force: true });
            });
          });
        },
        buttons: [
          {
            label: "Use",
            icon: "fa-solid fa-fire-flame-curved",
            action: "use",
            class: "etheria-button",
            callback: (_event, _button, dialog) =>
              Array.from(
                dialog.element.querySelectorAll(".selectable-ability"),
              ).map((el) => el.dataset.abilityId),
          },
        ],
      })) ?? [];

    const selectedAbilities = abilities.filter((doc) =>
      abilitiesIds.includes(doc.id),
    );
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
              const checkbox = ev.currentTarget.closest(".selectable-skill").querySelector('input[type="checkbox"]');
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
            callback: (_event, _button, dialog) =>
              Array.from(
                dialog.element.querySelectorAll(".selectable-skill"),
              ).map((el) => el.dataset.skillId),
          },
        ],
      })) ?? [];
  }
}
