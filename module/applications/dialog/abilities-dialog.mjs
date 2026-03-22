import { ETHERIA } from "../../config.mjs";
import { DOC_SUB_TYPES, MODULE_ID, TEMPLATE_PATH } from "../../constants.mjs";

const { Application, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * @typedef _AbilitiesDialogConfiguration
 * @property {foundry.documents.Actor} actor - The Actor document
 */

/**
 * @typedef {foundry.applications.types.ApplicationConfiguration & _AbilitiesDialogConfiguration} AbilitiesDialogConfiguration
 */

export default class EtheriaAbilitiesDialog extends HandlebarsApplicationMixin(
  Application,
) {
  /** @param {AbilitiesDialogConfiguration} options */
  constructor(options = {}) {
    super(options);
    this.#actor = options.actor;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "etheria-abilities-dialog",
    classes: [MODULE_ID, "abilities-dialog"],
    window: {
      icon: "fa-solid fa-meteor",
    },
    actions: {
      openSheet: EtheriaAbilitiesDialog.#onOpenSheet,
      toggleAbility: EtheriaAbilitiesDialog.#onToggleAbility,
      toggleAccordion: EtheriaAbilitiesDialog.#onToggleAccordion,
    },
    form: {
      handler: EtheriaAbilitiesDialog.#onFormSubmit,
      closeOnSubmit: true,
    },
  };

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${this.actor.name}: Abilities`;
  }

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: `${TEMPLATE_PATH}/dialogs/abilities-dialog.hbs`,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------- */
  /* Context Preparation                          */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const { ability, weapon } = DOC_SUB_TYPES.items;

    const items = [
      ...this.actor.itemTypes[weapon],
      ...this.actor.itemTypes[ability],
    ].toSorted((a, b) => a.name.localeCompare(b.name));

    const groups = items.reduce((acc, i) => {
      const { actionType, metadata, equipped } = i.system;
      const key = actionType ?? "misc";
      if (metadata.isEquippable && !equipped) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(i);
      return acc;
    }, {});

    const abilities = Object.fromEntries(
      Object.entries(ETHERIA.abilityType).map(([key, { label }]) => [
        key,
        {
          label,
          accordion: !!this.#accordions[key],
          items: groups[key] ?? [],
        },
      ]),
    );

    return {
      ...context,
      actor: this.actor,
      abilities,
      buttons: [
        {
          type: "submit",
          icon: "fa-solid fa-fire-flame-curved",
          label: "Use",
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

  #accordions = {};

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * The form submission handler method.
   * @this {EtheriaAbilitiesDialog}
   * @type {foundry.applications.types.ApplicationFormSubmission}
   */
  static async #onFormSubmit(_event, form, _formData) {
    const activeElements = form.querySelectorAll(".selectable-ability.active");
    const selectedIds = Array.from(
      activeElements,
      (el) => el.dataset.abilityId,
    );

    for (const id of selectedIds) {
      const ability = this.actor.items.get(id);
      await ability?.use();
    }
  }

  /* -------------------------------------------- */

  /**
   *
   * @this {EtheriaAbilitiesDialog}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onOpenSheet(_event, target) {
    const uuid = target.dataset.abilityUuid;
    const doc = await foundry.utils.fromUuid(uuid);
    doc?.sheet.render({ force: true });
  }

  /**
   *
   * @this {EtheriaAbilitiesDialog}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onToggleAbility(_event, target) {
    target.classList.toggle("active");
  }

  /**
   * Toggles the expanded state of the message accordion
   * @this {EtheriaItemMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onToggleAccordion(_event, target) {
    const accordionId = target.dataset.category;
    const currentState = this.#accordions;
    currentState[accordionId] = !currentState[accordionId];

    this.#accordions = currentState;
    target
      .closest(".accordion")
      ?.classList.toggle("expanded", currentState[accordionId]);
  }
}
