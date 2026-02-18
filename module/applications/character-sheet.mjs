import { ETHERIA } from "../config.mjs";
import { MODULE_ID, TEMPLATE_PATH } from "../constants.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheet } = foundry.applications.sheets;

/**
 * @import {HandlebarsApplicationRenderOptions} from "./_types.mjs";
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
    actions: {},
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
    secondaryStats: {
      template: `${TEMPLATES_PATH_CHARACTER}/secondary-stats.hbs`,
      scrollable: [""],
    },
    resistances: {
      template: `${TEMPLATES_PATH_CHARACTER}/resistances.hbs`,
      scrollable: [""],
    }
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "character", label: "Character" },
        { id: "resistances", label: "Resistances" },
        { id: "secondaryStats", label: "Secondary Stat" },
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
    };
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (partId in context.tabs) context.tab = context.tabs[partId];

    switch (partId) {
      case "header":
        await this._prepareHeaderContext(context, options);
        break;
      case "character":
        await this._prepareCharacterContext(context, options);
        break;
      case "secondaryStats":
        await this._prepareSecondaryStatsContext(context, options);
        break;
    }

    return context;
  }

  /**
   * Prepare render context for the header part.
   * @param {foundry.applications.types.ApplicationRenderContext} context
   * @param {HandlebarsApplicationRenderOptions} options
   * @returns {Promise<void>}
   * @protected
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
   * @param {foundry.applications.types.ApplicationRenderContext} context
   * @param {HandlebarsApplicationRenderOptions} options
   * @returns {Promise<void>}
   * @protected
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
   * @param {foundry.applications.types.ApplicationRenderContext} context
   * @param {HandlebarsApplicationRenderOptions} options
   * @returns {Promise<void>}
   * @protected
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
}
