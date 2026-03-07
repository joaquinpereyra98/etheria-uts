import { MODULE_ID, queries, TEMPLATE_PATH } from "../../constants.mjs";
import { getDiceWithPaths } from "../../utils.mjs";

const { Application, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * @typedef _RollDialogConfiguration
 * @property {foundry.dice.Roll} [roll] - An existing Roll instance.
 * @property {string} [formula] - A roll formula used to create a new Roll if one isn't provided.
 * @property {object} [rollData] - Contextual data for the roll formula (e.g., actor attributes).
 * @property {String[]} [targets=[]] - Array of targeted tokens uuid to evaluate against.
 * @property {Function} [resolve] - Callback function to resolve the dialog's Promise.
 */

/**
 * @typedef {foundry.applications.types.ApplicationConfiguration & _RollDialogConfiguration} RollDialogConfiguration
 */

const ROLL_DIALOG_PATH = `${TEMPLATE_PATH}/dialogs/roll-dialog`;

/**
 * A multi-step dialog for configuring rolls
 * @extends {foundry.applications.api.Application}
 * @mixes foundry.applications.api.HandlebarsApplicationMixin
 */
export default class EtheriaRollDialog extends HandlebarsApplicationMixin(
  Application,
) {
  /**@param {RollDialogConfiguration} options  */
  constructor(options) {
    const { roll, formula, rollData, targets, resolve, ...rest } = options;
    super(rest);

    this.#rollData = roll?.data ?? rollData;
    this.#originalFormula = roll?.formula ?? formula;

    if (!this.#originalFormula)
      throw new Error(
        "EtheriaRollDialog requires either a 'roll' object or a 'formula' string.",
      );

    this.#roll =
      roll ?? foundry.dice.Roll.create(this.#originalFormula, this.#rollData);

    this.#targets = Array.from(targets).map((target) => ({
      doc: foundry.utils.fromUuidSync(target.uuid),
      isHit: false,
    }));

    this._resolve = resolve;
  }
  /**
   * @inheritdoc
   * @type {Partial<foundry.applications.types.ApplicationConfiguration>}
   */
  static DEFAULT_OPTIONS = {
    classes: [MODULE_ID, "roll-dialog"],
    tag: "div",
    window: {
      icon: "fa-solid fa-dice-d20",
      resizable: true,
    },
    position: {
      width: 385,
      height: 292,
    },
    actions: {
      nextStep: EtheriaRollDialog.#onNextStep,
      previousStep: EtheriaRollDialog.#onPreviousStep,
      resolveDialog: EtheriaRollDialog.#onResolveDialog,
    },
  };

  /**
   * @override
   * @type {Record<string, import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart>}
   */
  static PARTS = {
    header: { template: `${ROLL_DIALOG_PATH}/header.hbs` },
    modifiers: {
      template: `${ROLL_DIALOG_PATH}/modifiers.hbs`,
      scrollable: [""],
      forms: {
        form: {
          handler: EtheriaRollDialog.#onModifierSubmitForm,
          submitOnChange: true,
        },
      },
    },
    dice: {
      template: `${ROLL_DIALOG_PATH}/dice.hbs`,
      scrollable: [""],
      forms: {
        form: {
          handler: EtheriaRollDialog.#onDiceSubmitForm,
          submitOnChange: true,
        },
      },
    },
    targets: {
      template: `${ROLL_DIALOG_PATH}/targets.hbs`,
      scrollable: [""],
      forms: {
        form: {
          handler: EtheriaRollDialog.#onTargetsSubmitForm,
          submitOnChange: true,
        },
      },
    },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  /* -------------------------------------------- */
  /* Application Properties                       */
  /* -------------------------------------------- */

  /**@type {String} */
  #originalFormula;

  get originalFormula() {
    return this.#originalFormula;
  }

  /**@type {Object} */
  #rollData;

  /**@type {foundry.dice.Roll} */
  #roll;

  #modifiers = {
    additives: "",
    multipliers: "",
    percentages: "",
  };

  /**@type {{doc: foundry.documents.TokenDocument, isHit: Boolean}[]} */
  #targets;

  /**
   * The sequence of steps for the dialog workflow.
   * @type {Array<{id: string, label: string, index: number}>}
   */
  get STEPS() {
    return [
      { id: "modifiers", label: "Modifiers", index: 0 },
      { id: "dice", label: "Dice Results", index: 1 },
      { id: "targets", label: "Targets", index: 2 },
    ];
  }

  #currentStepIndex = 0;

  /* -------------------------------------------- */
  /* Context Preparation                          */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.roll = this.#roll;
    context.formula = this.#roll.formula;

    context.modifiers = this.#modifiers;
    context.targets = this.#targets;

    context.step = this.STEPS[this.#currentStepIndex];
    context.isFirstStep = this.#currentStepIndex === 0;
    context.isLastStep = this.#currentStepIndex === this.STEPS.length - 1;
    return context;
  }

  /**@inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    const methodName = `_prepare${partId.capitalize()}Context`;
    const fn = this[methodName];
    if (fn instanceof Function) await fn.call(this, context, options);

    const stepConfig = this.STEPS.find((s) => s.id === partId);
    if (stepConfig) {
      context.isActive = stepConfig.index === this.#currentStepIndex;
      context.partClass = context.isActive ? "active" : "hidden";
    }

    return context;
  }

  /**
   * Prepares the context for the header part.
   * @param {object} context - The context object for the part.
   * @param {object} options - The options for preparing the part context.
   * @protected
   */
  _prepareHeaderContext(context, options) {
    const { additive, multiplier, percentage } = this.#getModifierTotals();
    let formulaHtml = `<span class="formula-base">${this.originalFormula.replace(/\s+/g, "")}</span>`;

    if (additive !== 0) {
      formulaHtml += ` <span class="formula-additive">${additive.signedString()}</span>`;
    }

    if (multiplier !== 1) {
      formulaHtml =
        `<span class="formula-paren">(</span>${formulaHtml}<span class="formula-paren">)</span>` +
        ` <span class="formula-multiplier">*${multiplier}</span>`;
    }

    if (percentage !== 0) {
      formulaHtml =
        `<span class="formula-paren">(</span>${formulaHtml}<span class="formula-paren">)</span>` +
        `<span class="formula-percentage">*(${percentage.signedString()}%)</span>`;
    }
    context.formulaHtml = formulaHtml;
  }

  /**
   * Prepares the context for the dice part.
   * @param {object} context - The context object for the part.
   * @param {object} options - The options for preparing the part context.
   * @protected
   */
  _prepareDiceContext(context, options) {
    context.terms = getDiceWithPaths(this.#roll.toJSON().terms);
  }

  /**
   * Prepares the context for the footer part.
   * @param {object} context - The context object for the part.
   * @param {object} options - The options for preparing the part context.
   * @protected
   */
  _prepareFooterContext(context, options) {
    const buttons = [];
    if (!context.isFirstStep) {
      buttons.push({
        type: "button",
        action: "previousStep",
        label: "Back",
        icon: "fa-solid fa-arrow-left",
        cssClass: "etheria-button",
      });
    }
    if (!context.isLastStep) {
      buttons.push({
        type: "button",
        action: "nextStep",
        label: "Next",
        icon: "fa-solid fa-arrow-right",
        cssClass: "etheria-button",
      });
    } else {
      buttons.push({
        type: "button",
        action: "resolveDialog",
        label: "Roll!",
        icon: "fa-solid fa-dice",
        cssClass: "etheria-button",
      });
    }
    context.buttons = buttons;
  }

  /* -------------------------------------------- */
  /* Internal Logic                               */
  /* -------------------------------------------- */

  /**
   * Recursively strips evaluation data and returns the cleaned object.
   * @param {object|foundry.dice.Roll} data - The Roll or Roll data to reset.
   * @returns {object} The cleaned Roll data object.
   */
  static #resetEvaluation(data) {
    let rollData = data instanceof foundry.dice.Roll ? data.toJSON() : data;

    if (!rollData || typeof rollData !== "object") return rollData;

    rollData.evaluated = false;
    delete rollData.total;
    delete rollData._total;
    delete rollData.result;

    if (Array.isArray(rollData.terms)) {
      rollData.terms = rollData.terms.map((term) => {
        term.evaluated = false;
        delete term.total;
        delete term._total;
        delete term.result;

        // ParentheticalTerms
        if (term.roll) {
          term.roll = EtheriaRollDialog.#resetEvaluation(term.roll);
        }

        // PoolTerms and FunctionTerms
        if (Array.isArray(term.rolls)) {
          term.rolls = term.rolls.map((r) =>
            EtheriaRollDialog.#resetEvaluation(r),
          );
        }

        return term;
      });
    }

    return rollData;
  }
  /**
   * Calculates the total modifiers from the additive, multiplier, and percentage inputs.
   * @returns {{additive: number, multiplier: number, percentage: number}}
   * @private
   */
  #getModifierTotals() {
    const { additives, multipliers, percentages } = this.#modifiers;
    const additive = (additives?.match(/[+-]?(\d+(\.\d+)?)/g) || []).reduce(
      (acc, val) => acc + (parseFloat(val) || 0),
      0,
    );

    const multiplier = (
      multipliers?.match(/[*\/]?[+-]?(\d+(\.\d+)?)/g) || []
    ).reduce((acc, val) => {
      const num = parseFloat(val.replace(/[*\/]/g, "")) || 1;
      return val.includes("/") ? acc / num : acc * num;
    }, 1);

    const percentage = (percentages?.match(/[+-]?(\d+(\.\d+)?)/g) || []).reduce(
      (acc, p) => acc + (parseFloat(p) || 0),
      0,
    );

    return { additive, multiplier, percentage };
  }

  /* -------------------------------------------- */
  /* Event Handlers                               */
  /* -------------------------------------------- */

  /**
   * Parses and sanitizes modifier input strings into a standardized format
   * @this {EtheriaRollDialog}
   * @type {foundry.applications.types.ApplicationFormSubmission}
   */
  static async #onModifierSubmitForm(_event, _form, formData) {
    const data = foundry.utils.expandObject(formData.object);

    if (data.additives) {
      data.additives =
        data.additives
          .match(/[+-]?(\d+(\.\d+)?)/g)
          ?.map((n) => {
            const sign = n.startsWith("-") ? "-" : "+";
            const num = n.replace(/[+-]/, "");
            return `${sign} ${num}`;
          })
          .join(" ") || "";
    }

    if (data.multipliers) {
      data.multipliers =
        data.multipliers
          .match(/[*\/]?[+-]?(\d+(\.\d+)?)/g)
          ?.map((m) => {
            const op = m.startsWith("/") ? "/" : "*";
            const num = m.replace(/[*\/]/, "");
            return `${op} ${num}`;
          })
          .join(" ") || "";
    }

    if (data.percentages) {
      data.percentages =
        data.percentages
          .match(/[+-]?(\d+(\.\d+)?)/g)
          ?.map((p) => {
            const sign = p.startsWith("-") ? "-" : "+";
            const num = p.replace(/[+-]/, "");
            return `${sign} ${num} %`;
          })
          .join(" ") || "";
    }

    this.#modifiers = {
      additives: data.additives || "",
      multipliers: data.multipliers || "",
      percentages: data.percentages || "",
    };

    this.render();
  }

  /**
   * Updates the roll results based on manual dice entry.
   * @this {EtheriaRollDialog}
   * @type {foundry.applications.types.ApplicationFormSubmission}
   */
  static async #onDiceSubmitForm(_event, _form, formData) {
    const data = formData.object;

    const json = EtheriaRollDialog.#resetEvaluation(this.#roll);

    for (const [key, value] of Object.entries(data)) {
      foundry.utils.setProperty(json, key, value);
    }
    this.#roll = foundry.dice.Roll.fromData(json);
    await this.#roll.evaluate();
    this.render();
  }

  /**
   *
   * @this {EtheriaRollDialog}
   * @type {foundry.applications.types.ApplicationFormSubmission}
   */
  static async #onTargetsSubmitForm(_event, _form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    foundry.utils.mergeObject(this.#targets, data.targets);
  }

  /* -------------------------------------------- */

  /**
   * Processes the current step's data and increments the step index
   * @this {EtheriaRollDialog}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onNextStep() {
    const currentStep = this.STEPS[this.#currentStepIndex];

    if (currentStep.id === "modifiers") {
      const { additive, multiplier, percentage } = this.#getModifierTotals();
      let formula = this.originalFormula;

      if (additive !== 0) {
        formula += ` ${additive.signedString()}`;
      }

      if (multiplier !== 1) {
        formula = `(${formula}) * ${multiplier}`;
      }

      if (percentage !== 0) {
        const percentageBonus = (1 + percentage / 100).signedString();
        formula = `round((${formula})*(${percentageBonus}))`;
      }

      this.#roll = foundry.dice.Roll.create(formula, this.#rollData);
      await this.#roll.evaluate();
    }
    this.#currentStepIndex++;
    this.render();
  }

  /**
   * Resets data as needed and decrements the step index.
   * @this {EtheriaRollDialog}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onPreviousStep() {
    const currentStep = this.STEPS[this.#currentStepIndex];

    if (currentStep.id === "dice") {
      this.#roll = foundry.dice.Roll.create(
        this.originalFormula,
        this.#rollData,
      );
    }
    this.#currentStepIndex--;
    this.render();
  }

  /**
   * Resets data as needed and decrements the step index.
   * @this {EtheriaRollDialog}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onResolveDialog() {
    this._resolve({
      roll: this.#roll.toJSON(),
      targets: this.#targets.map((t) => ({
        uuid: t.doc.uuid,
        isHit: t.isHit,
      })),
    });
    this.close();
  }

  /**
   * A helper factory method to create and render the dialog, returning a Promise.
   * @param {RollDialogConfiguration} [options={}] - Options to configure the dialog.
   * @returns {Promise<{roll: foundry.dice.Roll, targets: {uuid: String, isHit: Boolean}[]}>}
   */
  static async wait(options = {}) {
    return new Promise((resolve) => {
      const dialog = new this({ ...options, resolve });
      dialog.render(true);
    });
  }

  /**
   * Present an asynchronous query to a specific User for response.
   * @param {foundry.documents.User|string} user - A User instance or a User id
   * @param {RollDialogConfiguration} options - Options to configure the dialog.
   * @returns {Promise<{roll: foundry.dice.Roll, targets: {uuid: String, isHit: Boolean}[]}>}
   */
  static async query(user, options = {}) {
    if (typeof user === "string") {
      const userId = user;
      user = game.users.get(userId);
      if (!user) throw new Error(`User [${userId}] does not exist`);
    }

    if (user.isSelf) return await EtheriaRollDialog.wait(options);
    return user.query(queries.rollDialog, { options });
  }

  static _handleQuery({ options }) {
    return EtheriaRollDialog.wait(options);
  }
}
