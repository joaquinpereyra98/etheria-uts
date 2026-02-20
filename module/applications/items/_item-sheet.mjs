import { enrichHTML, prepareActiveEffectCategories } from "../../utils.mjs";
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
    context.effects = prepareActiveEffectCategories(
      this.item.effects,
    );
    return context;
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
        img: cls.getDefaultArtwork(),
        disabled: effectType === "inactive",
        origin: this.actor.uuid,
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
