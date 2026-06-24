import { DOC_SUB_TYPES, MODULE_ID, TEMPLATE_PATH } from "../../constants.mjs";

const { Application, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * @typedef _EquippedItemsConfiguration
 * @property {foundry.documents.Actor} actor - The Actor document
 */

/**
 * @typedef {foundry.applications.types.ApplicationConfiguration & _EquippedItemsConfiguration} EquippedItemsConfiguration
 */

export default class EtheriaEquippedItemsDialog extends HandlebarsApplicationMixin(
  Application,
) {
  /** @param {EquippedItemsConfiguration} options */
  constructor(options = {}) {
    super(options);
    this.#actor = options.actor;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "etheria-items-dialog",
    classes: [MODULE_ID, "items-dialog"],
    window: {
      icon: "fa-solid fa-sword",
    },
    actions: {
      openSheet: EtheriaEquippedItemsDialog.#onOpenSheet,
      toggleItem: EtheriaEquippedItemsDialog.#onToggleItem,
    },
    form: {
      handler: EtheriaEquippedItemsDialog.#onFormSubmit,
      closeOnSubmit: true,
    },
  };

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${this.actor.name}: Equipped Items`;
  }

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: `${TEMPLATE_PATH}/dialogs/items-dialog.hbs`,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /**
   * Helper factory method to instantiate, render, and await the result of the dialog.
   * @param {Partial<EquippedItemsConfiguration>} [config={}] - Configuration options passed to the dialog constructor.
   * @param {foundry.applications.types.ApplicationRenderOptions} [renderOptions={}] - Form rendering options.
   * @returns {Promise<foundry.documents.Item|null>} - A promise that resolves to the selected document, or null if the dialog was closed without a submission.
   */
  static create(config = {}, renderOptions = {}) {
    return new Promise((resolve, _reject) => {
      const dialog = new this(config);
      dialog.addEventListener("close", () => resolve(dialog.resolveValue), {
        once: true,
      });
      dialog.render({ ...renderOptions, force: true });
    });
  }

  /* -------------------------------------------- */
  /* Context Preparation                          */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const { weapon } = DOC_SUB_TYPES.items;

    const items = [...this.actor.itemTypes[weapon]].toSorted((a, b) =>
      a.name.localeCompare(b.name),
    );

    return {
      ...context,
      actor: this.actor,
      items,
      buttons: [
        {
          type: "submit",
          icon: "fa-solid fa-swords",
          label: "Select",
          cssClass: "etheria-button",
        },
      ],
    };
  }

  /* -------------------------------------------- */
  /* Properties                                   */
  /* -------------------------------------------- */

  /**
   * A convenience reference to the Actor document
   * @type {foundry.documents.Actor}
   */
  get actor() {
    return this.#actor;
  }

  #actor;

  /**@type {HTMLElement} */
  #active;

  /**
   * Returns the selection value for the promise resolution
   * @type {foundry.documents.Item|null}
   */
  get resolveValue() {
    return this.#resolveValue;
  }

  /** @type {foundry.documents.Item|null} */
  #resolveValue = null;

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * The form submission handler method.
   * @this {EtheriaEquippedItemsDialog}
   * @type {foundry.applications.types.ApplicationFormSubmission}
   */
  static async #onFormSubmit(_event, form, _formData) {
    const uuid = this.#active.dataset.itemUuid;
    const doc = await foundry.utils.fromUuid(uuid);
    this.#resolveValue = doc;
  }

  /* -------------------------------------------- */

  /**
   *
   * @this {EtheriaEquippedItemsDialog}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onOpenSheet(_event, target) {
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const doc = await foundry.utils.fromUuid(uuid);
    doc?.sheet.render({ force: true });
  }

  /**
   * Handles the click action for toggling the active state of an item card.
   * @this {EtheriaEquippedItemsDialog}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onToggleItem(_event, target) {
    const wasActive = this.#active === target;

    if (this.#active) {
      this.#active.classList.remove("active");
      this.#active = null;
    }

    if (!wasActive) {
      target.classList.add("active");
      this.#active = target;
    }
  }
}
