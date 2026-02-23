import { ETHERIA } from "../config.mjs";
import {
  DOC_SUB_TYPES,
  EFFECT_DATA_DEFAULT,
  MODULE_ID,
  TEMPLATE_PATH,
} from "../constants.mjs";
import { enrichHTML, prepareActiveEffectCategories } from "../utils.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheet } = foundry.applications.sheets;

/**
 * @import {PartContextCallback} from "./_types.mjs";
 */

const TEMPLATES_PATH_CHARACTER = `${TEMPLATE_PATH}/character-sheet`;

export default class EtheriaCharacterSheet extends HandlebarsApplicationMixin(
  ActorSheet,
) {
  /**
   * @inheritdoc
   * @type {Partial<foundry.applications.types.ApplicationConfiguration>}
   */
  static DEFAULT_OPTIONS = {
    classes: [MODULE_ID, "sheet", "character"],
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: true,
    },
    position: {
      height: 720,
      width: 600,
    },
    actions: {
      createAbility: EtheriaCharacterSheet.#onCreateAbility,
      createEffect: EtheriaCharacterSheet.#onCreateEffect,
      toggleEffect: EtheriaCharacterSheet.#onToggleEffect,
      viewDoc: EtheriaCharacterSheet.#onViewDoc,
      deleteDoc: EtheriaCharacterSheet.#onDeleteDoc,
    },
  };

  /** @override */
  static PARTS = {
    header: {
      template: `${TEMPLATES_PATH_CHARACTER}/header.hbs`,
      templates: [`${TEMPLATES_PATH_CHARACTER}/partials/resource-field.hbs`],
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    character: {
      template: `${TEMPLATES_PATH_CHARACTER}/character.hbs`,
      scrollable: [""],
    },
    resistances: {
      template: `${TEMPLATES_PATH_CHARACTER}/resistances.hbs`,
      scrollable: [""],
    },
    spheres: {
      template: `${TEMPLATES_PATH_CHARACTER}/spheres.hbs`,
      scrollable: [""],
    },
    abilities: {
      template: `${TEMPLATES_PATH_CHARACTER}/abilities.hbs`,
      scrollable: [""],
    },
    effects: {
      template: `${TEMPLATE_PATH}/common/effects.hbs`,
      scrollable: [""],
    },
    secondaryStats: {
      template: `${TEMPLATES_PATH_CHARACTER}/secondary-stats.hbs`,
      scrollable: [""],
    },
    notes: {
      template: `${TEMPLATES_PATH_CHARACTER}/notes.hbs`,
    },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "character", label: "Character" },
        { id: "resistances", label: "Resistances" },
        { id: "abilities", label: "Abilities" },
        { id: "spheres", label: "Spheres" },
        { id: "effects", label: "Effects" },
        { id: "secondaryStats", label: "Secondary Stat" },
        { id: "notes", label: "Notes" },
      ],
      initial: "character",
    },
  };

  /* -------------------------------------------- */
  /* Context Preparation                          */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    return {
      ...context,
      config: CONFIG.ETHERIA,
      actor: this.actor,
      system: this.actor.system,
      systemFields: this.actor.system.schema.fields,
      user: game.user,
    };
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (partId in context.tabs) context.tab = context.tabs[partId];

    const methodName = `_prepare${partId.capitalize()}Context`;
    const fn = this[methodName];
    if (fn instanceof Function) await fn.call(this, context, options);
    return context;
  }

  /**
   * Prepare render context for the header part.
   * @type {PartContextCallback}
   */
  async _prepareHeaderContext(context, _options) {
    const { system } = this.actor;

    const mapResources = (sourcePath) => {
      const source = system[sourcePath] || {};
      return Object.fromEntries(
        Object.entries(source).map(([key, data]) => [
          key,
          {
            field: system.schema.getField(`${sourcePath}.${key}`),
            value: data,
          },
        ]),
      );
    };

    context.resources = {
      ...mapResources("resources"),
      ...mapResources("resourcesExtra"),
    };
  }

  /**
   * Prepare render context for the character part.
   * @type {PartContextCallback}
   */
  async _prepareCharacterContext(context, _options) {
    const attributes = this.actor.system.attributes;
    context.attributes = Object.fromEntries(
      Object.entries(attributes).map(([key, data]) => [
        key,
        {
          field: this.actor.system.schema.getField(`attributes.${key}.value`),
          value: data.value,
          mod: data.mod,
        },
      ]),
    );

    context.exhaustion = {
      field: this.actor.system.schema.getField("exhaustion"),
      value: this.actor.system.exhaustion,
      mod: this.actor.system.exhaustion * -3,
    };
  }

  /**
   * Prepare render context for the Secondary Stats part.
   * @type {PartContextCallback}
   */
  async _prepareSecondaryStatsContext(context, _options) {
    const skills = this.actor.system.skills;
    context.skills = Object.entries(skills).reduce((acc, [key, data]) => {
      acc[data.attribute] ??= {
        label: ETHERIA.attributes[data.attribute]?.label,
        skills: {},
      };
      acc[data.attribute].skills[key] = {
        field: this.actor.system.schema.getField(`skills.${key}.value`),
        total: data.total,
        value: data.value,
      };
      return acc;
    }, {});
    return context;
  }

  /**
   * Prepare render context for the Resistances part.
   * @type {PartContextCallback}
   */
  async _prepareResistancesContext(context, _options) {
    const resistances = this.actor.system.resistances;
    context.resistances = Object.entries(resistances).reduce(
      (acc, [key, data]) => {
        const context = {
          field: this.actor.system.schema.getField(`resistances.${key}`),
          value: data,
          icon: ETHERIA.damageTypes[key]?.icon ?? "",
        };

        if (key === "true") {
          acc.all = context;
        } else if (ETHERIA.damageTypes[key]?.isMagic) {
          acc.magic[key] = context;
        } else {
          acc.simple[key] = context;
        }

        return acc;
      },
      {
        all: {},
        magic: {},
        simple: {},
      },
    );
    return context;
  }

  /**
   * Prepare render context for the Spheres part.
   * @type {PartContextCallback}
   */
  async _prepareSpheresContext(context, _options) {
    const magicSpheres = this.actor.system.magicSpheres;
    context.magicSpheres = Object.entries(magicSpheres).reduce(
      (acc, [key, data]) => {
        const context = {
          field: this.actor.system.schema.getField(`magicSpheres.${key}`),
          value: data,
          icon: ETHERIA.magicSpheres[key]?.icon ?? "",
        };

        acc[key] = context;
        return acc;
      },
      {},
    );
    return context;
  }

  /**
   * Prepare render context for the Effects part.
   * @type {PartContextCallback}
   */
  async _prepareEffectsContext(context, _options) {
    context.effects = prepareActiveEffectCategories(
      this.actor.allApplicableEffects(),
    );
    return context;
  }

  /**
   * Prepare render context for the Notes part.
   * @type {PartContextCallback}
   */
  async _prepareNotesContext(context, _options) {
    const { description, gmNotes } = this.actor.system.details;

    const enrichmentOptions = {
      secrets: game.user.isGM,
      rollData: this.actor.getRollData(),
      relativeTo: this.actor,
    };

    context.description = {
      field: this.actor.system.schema.getField(`details.description`),
      value: description,
      enrich: await enrichHTML(description, enrichmentOptions),
    };
    context.gmNotes = {
      field: this.actor.system.schema.getField(`details.gmNotes`),
      value: gmNotes,
      enrich: await enrichHTML(gmNotes, enrichmentOptions),
    };
  }

  /**
   * Prepare render context for the Notes part.
   * @type {PartContextCallback}
   */
  /** @inheritdoc */
  async _prepareAbilitiesContext(context, _options) {
    const allAbilities = this.actor.itemTypes[DOC_SUB_TYPES.items.ability].sort(
      (a, b) => a.sort - b.sort,
    );

    context.abilities = Object.fromEntries(
      Object.entries(ETHERIA.abilityType).map(([key, { label }]) => [
        key,
        {
          label,
          items: allAbilities.filter((i) => i.system.actionType === key),
        },
      ]),
    );

    context.damageTypeChoices = Object.fromEntries(
      Object.entries({ ...ETHERIA.damageTypes, ...ETHERIA.healingTypes }).map(([k, v]) => [k, v.label]),
    );
    context.resourcesChoices = this.actor.system.getResourcesChoices();
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onCreateAbility(event, target) {
    const { category } = target.closest("[data-category]")?.dataset ?? {};
    const cls = foundry.documents.Item.implementation;

    const docData = {
      name: cls.defaultName({
        type: DOC_SUB_TYPES.items.ability,
        parent: this.document,
      }),
      type: DOC_SUB_TYPES.items.ability,
      img: cls.getDefaultArtwork()?.img,
      system: {
        actionType: category,
      },
    };

    await cls.create(docData, {
      parent: this.document,
      renderSheet: !event.shiftKey,
    });
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onCreateEffect(event, target) {
    const { effectType } = target.closest("[data-effect-type]")?.dataset ?? {};
    const cls = foundry.documents.ActiveEffect.implementation;

    const docData = foundry.utils.mergeObject(
      EFFECT_DATA_DEFAULT,
      {
        name: cls.defaultName({
          type: "base",
          parent: this.document,
        }),
        img: cls.getDefaultArtwork()?.img,
        disabled: effectType === "inactive",
        origin: this.document.uuid,
      },
      { inplace: false },
    );

    if (effectType === "temporary") {
      if (game.combat) {
        docData.duration = {
          rounds: 1,
          startRound: game.combat?.round,
          startTurn: game.combat?.turn,
        };
      } else {
        docData.duration = {
          seconds: 60,
          startTime: game.time.worldTime,
        };
      }
    }

    await cls.create(docData, {
      parent: this.document,
      renderSheet: !event.shiftKey,
    });
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onToggleEffect(_event, target) {
    const { docUuid } = target.closest("[data-doc-uuid]").dataset ?? {};
    const effect = foundry.utils.fromUuidSync(docUuid);
    effect.update({ disabled: !effect.disabled });
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onViewDoc(_event, target) {
    const { docUuid } = target.closest("[data-doc-uuid]").dataset ?? {};
    const doc = foundry.utils.fromUuidSync(docUuid);
    doc.sheet.render({ force: true });
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onDeleteDoc(event, target) {
    const { docUuid } = target.closest("[data-doc-uuid]").dataset ?? {};
    const doc = foundry.utils.fromUuidSync(docUuid);
    if (event.shiftKey) return doc.delete();
    return doc.deleteDialog();
  }
}
