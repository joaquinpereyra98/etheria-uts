import { enrichHTML } from "../../utils.mjs";
import { MODULE_ID, TEMPLATE_PATH } from "../../constants.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheet } = foundry.applications.sheets;

const TEMPLATES_PATH_ITEM = `${TEMPLATE_PATH}/item-sheet`;

export default class EtheriaItemSheet extends HandlebarsApplicationMixin(
  ItemSheet,
) {
  /**
   * @inheritdoc
   * @type {Partial<foundry.applications.types.ApplicationConfiguration>}
   */
  static DEFAULT_OPTIONS = {
    classes: [MODULE_ID, "sheet", "item"],
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: true,
    },
    position: {
      height: 525,
      width: 600,
    },
    actions: {},
  };

  /** @override */
  static PARTS = {
    header: {
      template: `${TEMPLATES_PATH_ITEM}/common/header.hbs`,
      templates: [
        "modules/etheria-uts/templates/character-sheet/partials/resource-field.hbs",
      ],
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    notes: {
      template: `${TEMPLATES_PATH_ITEM}/common/notes.hbs`,
      scrollable: [""],
    },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "notes", label: "Notes" }],
      initial: "notes",
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
      item: this.document,
      system: this.document.system,
      systemFields: this.document.system.schema.fields,
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
   * Prepare render context for the description part.
   * @type {PartContextCallback}
   */
  async _prepareNotesContext(context, _options) {
    const {system} =  this.item;
    const { value, gmNotes } = system.description;

    context.description = {
      field: system.schema.getField("description.value"),
      enrich: await enrichHTML(value, {
        secrets: game.user.isGM,
        rollData: this.actor?.getRollData(),
        relativeTo: this.actor,
      }),
      value: value,
    };

    context.gmNotes = {
      field: system.schema.getField("description.gmNotes"),
      enrich: await enrichHTML(gmNotes, {
        secrets: game.user.isGM,
        rollData: this.actor?.getRollData(),
        relativeTo: this.actor,
      }),
      value: gmNotes,
    };
  }
}
