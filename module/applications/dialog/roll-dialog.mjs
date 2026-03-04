import { MODULE_ID, TEMPLATE_PATH } from "../../constants.mjs";

const { Application, HandlebarsApplicationMixin } = foundry.applications.api;

export default class EtheriaRollDialog extends HandlebarsApplicationMixin(
  Application,
) {
  constructor(options) {
    super(options);
    this.#roll = options.roll;
    this._resolve = options.resolve;
  }
  /**
   * @inheritdoc
   * @type {Partial<foundry.applications.types.ApplicationConfiguration>}
   */
  static DEFAULT_OPTIONS = {
    classes: [MODULE_ID, "roll-dialog"],
    tag: "form",
    window: {
      icon: "fa-solid fa-dice-d20",
    },
    form: {
      handler: EtheriaRollDialog.#onSubmitForm,
      submitOnChange: true,
    },
  };

  /** @override */
  static PARTS = {
    body: {
      template: `${TEMPLATE_PATH}/dialogs/roll-dialog.hbs`,
      scrollable: [""],
    },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  /**@type {foundry.dice.Roll} */
  #roll;

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.roll = this.#roll;
    context.formula = this.#roll.formula;
    context.terms = this.#roll.terms.map((term) => term.toJSON());
    context.buttons = [
      {
        type: "button",
        action: "resolve",
        icon: "fa-solid fa-dice",
        label: "Roll!",
      },
    ];
    return context;
  }
  /**
   * Handle the roll submission.
   * @this {EtheriaRollDialog}
   * @type {foundry.applications.types.ApplicationFormSubmission}
   */
  static async #onSubmitForm(event, form, formData) {}
}
