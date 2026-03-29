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
    actions: {
      createEffect: EtheriaItemSheet.#onCreateEffect,
      toggleEffect: EtheriaItemSheet.#onToggleEffect,
      viewDoc: EtheriaItemSheet.#onViewDoc,
      deleteDoc: EtheriaItemSheet.#onDeleteDoc,
    },
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
    effects: {
      template: `${TEMPLATE_PATH}/common/effects.hbs`,
      scrollable: [""],
    },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "notes", label: "Notes" },
        { id: "effects", label: "Effects" },
      ],
      initial: "notes",
    },
  };

  /**@inheritdoc */
  _initializeApplicationOptions(options) {
    const applicationOptions = super._initializeApplicationOptions(options);
    applicationOptions.window.icon ||=
      options.document?.system?.constructor?.metadata?.icon;
    return applicationOptions;
  }

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
      isEditable: this.isEditable,
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
    const { system } = this.item;
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

  /**
   * Prepare render context for the Effects part.
   * @type {PartContextCallback}
   */
  async _prepareEffectsContext(context, _options) {
    const categories = {
      temporary: {
        type: "temporary",
        label: game.i18n.localize("UTS.Effect.Temporary"),
        effects: [],
      },
      passive: {
        type: "passive",
        label: game.i18n.localize("UTS.Effect.Passive"),
        effects: [],
      },
      inactive: {
        type: "inactive",
        label: game.i18n.localize("UTS.Effect.Inactive"),
        effects: [],
      },
    };

    for (const e of this.item.effects) {
      if (e.disabled) categories.inactive.effects.push(e);
      else if (e.isTemporary) categories.temporary.effects.push(e);
      else categories.passive.effects.push(e);
    }

    for (const c of Object.values(categories)) {
      c.effects.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    context.effects = categories;
  }

  /** @inheritdoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    const fn = this[`_attach${partId.capitalize()}Listeners`];

    if (fn instanceof Function) {
      fn.call(this, htmlElement, options);
    }
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
