import { DOC_SUB_TYPES, MODULE_ID, TEMPLATE_PATH } from "../constants.mjs";
import { enrichHTML } from "../utils.mjs";

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
      toggleMode: EtheriaCharacterSheet.#toggleMode,
      createAbility: EtheriaCharacterSheet.#onCreateAbility,
      createEffect: EtheriaCharacterSheet.#onCreateEffect,
      createItem: EtheriaCharacterSheet.#onCreateItem,
      createRace: EtheriaCharacterSheet.#onCreateRace,
      toggleEffect: EtheriaCharacterSheet.#onToggleEffect,
      toggleEquip: EtheriaCharacterSheet.#onToggleEquip,
      viewDoc: EtheriaCharacterSheet.#onViewDoc,
      deleteDoc: EtheriaCharacterSheet.#onDeleteDoc,
      rollAttribute: EtheriaCharacterSheet.#onRollAttribute,
      rollSkill: EtheriaCharacterSheet.#onRollSkill,
      rollAdvancement: EtheriaCharacterSheet.#onRollAdvancement,
      recoverResource: EtheriaCharacterSheet.#onRecoverResource,
      createResource: EtheriaCharacterSheet.#onCreateResource,
      deleteResource: EtheriaCharacterSheet.#onDeleteResource,
      viewImage: EtheriaCharacterSheet.#onViewImage,
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
      templates: [`${TEMPLATES_PATH_CHARACTER}/partials/resource-field.hbs`],
      scrollable: [""],
    },
    notes: {
      template: `${TEMPLATES_PATH_CHARACTER}/notes.hbs`,
    },
    inventory: {
      template: `${TEMPLATES_PATH_CHARACTER}/invetory.hbs`,
    },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "character", label: "Character" },
        { id: "resistances", label: "Resistances" },
        { id: "inventory", label: "Inventory" },
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
  /* Modes                                        */
  /* -------------------------------------------- */

  /**
   * Available sheet modes.
   * @enum {number}
   */
  static MODES = {
    PLAY: 1,
    EDIT: 2,
  };

  _mode = EtheriaCharacterSheet.MODES.PLAY;

  /**
   * Is this sheet in Play Mode?
   * @returns {boolean}
   */
  get isPlayMode() {
    return this._mode === EtheriaCharacterSheet.MODES.PLAY;
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = options.parts.filter((part) => {
      if (part === "spheres") return this.actor.system.details.isCaster;
      if (part === "secondaryStats") return game.user.isGM;
      return true;
    });
  }

  /* -------------------------------------------- */
  /* Context Preparation                          */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    return {
      ...context,
      isPlayMode: this.isPlayMode,
      config: CONFIG.ETHERIA,
      actor: this.actor,
      system: this.actor.system,
      systemFields: this.actor.system.schema.fields,
      user: game.user,
    };
  }

  /**@inheritdoc */
  _prepareTabs(group) {
    const activeTab = this.tabGroups[group];

    if (group === "primary") {
      const isInvalidCaster =
        activeTab === "spheres" && !this.actor.system.details.isCaster;
      const isInvalidGMTab = activeTab === "secondaryStats" && !game.user.isGM;

      if (isInvalidCaster || isInvalidGMTab) {
        this.tabGroups[group] = "character";
      }
    }

    return super._prepareTabs(group);
  }

  /**@override */
  _getTabsConfig(group) {
    const config = this.constructor.TABS[group];
    if (!config) return null;

    if (group === "primary")
      config.tabs = config.tabs.filter((t) => {
        if (t.id === "spheres") return this.actor.system.details.isCaster;
        if (t.id === "secondaryStats") return game.user.isGM;
        return true;
      });

    return config;
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
      const source = this.isPlayMode
        ? system[sourcePath]
        : system._source[sourcePath] || {};
      return Object.fromEntries(
        Object.entries(source).map(([key, data]) => [
          key,
          {
            field: system.schema.getField(`${sourcePath}.${key}`),
            path: `system.${sourcePath}.${key}`,
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

    const getRaw = (key) =>
      foundry.utils.getProperty(
        this.actor.system._source,
        `attributes.${key}.value`,
      );

    context.attributes = Object.fromEntries(
      Object.entries(attributes).map(([key, data]) => [
        key,
        {
          field: this.actor.system.schema.getField(`attributes.${key}.value`),
          value: this.isPlayMode ? data.value : getRaw(key),
          mod: data.mod,
        },
      ]),
    );

    context.exhaustion = {
      field: this.actor.system.schema.getField("exhaustion"),
      value: this.isPlayMode
        ? this.actor.system.exhaustion
        : this.actor.system._source.exhaustion,
      mod: this.actor.system.exhaustion * -3,
    };
  }

  /**
   * Prepare render context for the Secondary Stats part.
   * @type {PartContextCallback}
   */
  async _prepareSecondaryStatsContext(context, _options) {
    const skills = this.actor.system.skills;
    const getRaw = (key) =>
      foundry.utils.getProperty(
        this.actor.system._source,
        `skills.${key}.value`,
      );

    context.skills = Object.entries(skills).reduce((acc, [key, data]) => {
      const attributeKey = CONFIG.ETHERIA.skills[key].attribute;
      acc[attributeKey] ??= {
        label: CONFIG.ETHERIA.attributes[attributeKey]?.label,
        skills: {},
      };
      acc[attributeKey].skills[key] = {
        field: this.actor.system.schema.getField(`skills.${key}.value`),
        total: data.total,
        value: this.isPlayMode ? data.value : getRaw(key),
      };
      return acc;
    }, {});

    const source = this.isPlayMode
      ? this.actor.system.actions
      : this.actor.system._source.actions || {};

    context.actions = Object.fromEntries(
      Object.entries(source).map(([key, data]) => [
        key,
        {
          field: this.actor.system.schema.getField(`actions.${key}`),
          path: `system.actions.${key}`,
          value: data,
        },
      ]),
    );

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
          icon: CONFIG.ETHERIA.damageTypes[key]?.icon ?? "",
        };

        if (key === "true") {
          acc.all = context;
        } else if (CONFIG.ETHERIA.damageTypes[key]?.isMagic) {
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
    const getRaw = (key) =>
      foundry.utils.getProperty(
        this.actor.system._source,
        `magicSpheres.${key}`,
      );

    const magicSpheres = this.actor.system.magicSpheres;
    context.magicSpheres = Object.entries(magicSpheres).reduce(
      (acc, [key, data]) => {
        const context = {
          field: this.actor.system.schema.getField(`magicSpheres.${key}`),
          value: this.isPlayMode ? data : getRaw(key),
          icon: CONFIG.ETHERIA.magicSpheres[key]?.icon ?? "",
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
    const categories = {
      temporary: {
        type: "temporary",
        label: "UTS.Effect.Temporary",
        effects: [],
      },
      passive: { type: "passive", label: "UTS.Effect.Passive", effects: [] },
      inactive: { type: "inactive", label: "UTS.Effect.Inactive", effects: [] },
    };

    for (const e of this.actor.allApplicableEffects()) {
      if (!e.active) {
        if (e.parent instanceof Item) continue;
        categories.inactive.effects.push(e);
      } else
        e.isTemporary
          ? categories.temporary.effects.push(e)
          : categories.passive.effects.push(e);
    }

    for (const c of Object.values(categories)) {
      c.label = game.i18n.localize(c.label);
      c.effects.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    context.effects = categories;
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
      Object.entries(CONFIG.ETHERIA.abilityType).map(([key, { label }]) => [
        key,
        {
          label,
          items: allAbilities.filter((i) => i.system.actionType === key),
        },
      ]),
    );

    context.damageTypeChoices = Object.fromEntries(
      Object.entries({ ...CONFIG.ETHERIA.damageTypes, ...CONFIG.ETHERIA.healingTypes }).map(
        ([k, v]) => [k, v.label],
      ),
    );
    context.resourcesChoices = this.actor.system.getResourcesChoices();
  }

  /**
   * Prepare render context for the Inventory part.
   * @type {PartContextCallback}
   */
  async _prepareInventoryContext(context, _options) {
    const categories = {
      equipped: {
        type: "equipped",
        label: "Equipped",
        items: [],
      },
      unequipped: {
        type: "unequipped",
        label: "Unequipped",
        items: [],
      },
    };

    const { ability, race } = DOC_SUB_TYPES.items;

    for (const i of this.actor.items) {
      if ([ability, race].includes(i.type)) continue;
      if (i.system.equipped) categories.equipped.items.push(i);
      else categories.unequipped.items.push(i);
    }
    context.inventory = categories;
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #toggleMode() {
    if (!this.isEditable)
      return console.error(
        "You can't switch to Edit mode if the sheet is uneditable",
      );

    const { EDIT, PLAY } = EtheriaCharacterSheet.MODES;
    this._mode = this.isPlayMode ? EDIT : PLAY;
    this.render();
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
      img: cls.getDefaultArtwork({ type: DOC_SUB_TYPES.items.ability })?.img,
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
  static async #onCreateRace(event, target) {
    const cls = foundry.documents.Item.implementation;

    const docData = {
      name: cls.defaultName({
        type: DOC_SUB_TYPES.items.race,
        parent: this.document,
      }),
      type: DOC_SUB_TYPES.items.race,
      img: cls.getDefaultArtwork({ type: DOC_SUB_TYPES.items.race })?.img,
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

    const docData = {
      name: cls.defaultName({
        type: "base",
        parent: this.document,
      }),
      disabled: effectType === "inactive",
      origin: this.document.uuid,
    };

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
  static async #onCreateItem(event, target) {
    const { section } = target.closest("[data-section]")?.dataset ?? {};
    const isEquipped = section === "equipped";

    const { armor, weapon, consumable, misc, shield } = DOC_SUB_TYPES.items;

    /**@type {foundry.documents.Item} */
    const cls = foundry.documents.Item.implementation;
    return cls.createDialog(
      {
        system: { equipped: isEquipped },
      },
      {
        parent: this.actor,
        pack: this.actor.pack,
      },
      { types: [armor, weapon, consumable, misc, shield] },
    );
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
  static #onToggleEquip(_event, target) {
    const { docUuid } = target.closest("[data-doc-uuid]").dataset ?? {};
    const item = foundry.utils.fromUuidSync(docUuid);
    item.update({ "system.equipped": !item.system.equipped });
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

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onRollAttribute(_event, target) {
    const { attribute } = target.closest("[data-attribute]").dataset ?? {};
    if (!attribute) return;
    return await this.actor.rollAttribute(attribute);
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onRollSkill(_event, target) {
    const { skill } = target.closest("[data-skill]").dataset ?? {};
    if (!skill) return;
    return await this.actor.rollSkill(skill);
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onRollAdvancement(_event, target) {
    const { type } = target.closest("[data-type]").dataset ?? {};
    if (!type) return;
    return await this.actor.rollAdvancement(type);
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onRecoverResource(_event, target) {
    const { resource } = target.closest("[data-resource]").dataset ?? {};
    if (!resource) return;
    return await this.actor.recoverResource(resource);
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onCreateResource(_event, target) {
    const row = target.closest(".create-row");
    const keyInput = row.querySelector("input.resource-key");
    const nameInput = row.querySelector("input.resource-name");

    const key = keyInput.value.trim().replace("_", " ").slugify({ replacement: "_", strict: true });
    const label = nameInput.value.trim() || key || "New Resource";

    if (!key) {
      return ui.notifications.warn(
        "A unique key is required to create a resource",
      );
    }

    if (foundry.utils.hasProperty(this.actor.system, `resourcesExtra.${key}`)) {
      return ui.notifications.error("A resource with that key already exists.");
    }

    await this.actor.update({
      [`system.resourcesExtra.${key}`]: {
        value: 0,
        max: 0,
        label: label,
      },
    });
  }

  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onDeleteResource(event, target) {
    const { key } = target.dataset ?? {};
    if (!key) return;
    if (!event.shiftKey) {
      const response = await foundry.applications.api.Dialog.confirm({
        content: "Are you sure you want to delete this resource?",
      });
      if (!response) return;
    }

    this.actor.update({
      [`system.resourcesExtra.${key}`]: _del,
    });
  }
  /**
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onViewImage() {
    const actor = this.document;
    new foundry.applications.apps.ImagePopout({
      src: actor.img,
      uuid: actor.uuid,
      window: { title: actor.name },
    }).render({
      force: true,
    });
  }
}
