import { DOC_SUB_TYPES } from "../../constants.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { ActiveEffectTypeDataModel } = foundry.data;
const { TypeDataModel } = foundry.abstract;

export default class EtheriaBaseEffect extends (ActiveEffectTypeDataModel ??
  TypeDataModel) {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...(super.defineSchema() ?? {}),
      apply: new fields.StringField({
        label: "Apply on",
        hint: "Determines the trigger for this effect",
        required: true,
        blank: false,
        choices: CONFIG.ETHERIA.applyEffect,
        initial: "equip",
      }),

      target: new fields.StringField({
        label: "Apply to",
        hint: "Defines the recipient of the effect",
        required: true,
        blank: false,
        choices: CONFIG.ETHERIA.targetEffect,
        initial: "self",
      }),

      stacks: new fields.NumberField({
        required: true,
        integer: false,
        positive: false,
        min: 0,
        label: "Stacks",
        hint: "Current intensity of the effect.",
      }),
      thresholds: new fields.SchemaField({
        key: new fields.StringField({
          required: false,
          blank: true,
          label: "Field Path",
        }),
        comparator: new fields.StringField({
          required: false,
          blank: true,
          choices: ["<", "<=", "==", ">=", ">", "!="].reduce(
            (acc, c) => ({ ...acc, [c]: c }),
            {},
          ),
          label: "Comparator",
        }),
        value: new FormulaField({
          required: false,
          blank: true,
          initial: "",
          label: "Value",
        }),
      }),
    };
  }

  /**@inheritdoc */
  async _preCreate(data = {}, options = {}, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    if (this.item) {
      if (this.item.type === DOC_SUB_TYPES.items.consumable && !data?.apply) {
        this.updateSource({ apply: "use" });
      }
    }
  }

  /**
   * Shortcut to the Actor owning the ActiveEffect (if it exists)
   * @type {foundry.documents.Actor|null}
   */
  get actor() {
    const { Actor, Item } = foundry.documents;
    const parent = this.parent.parent;
    if (parent instanceof Actor) return parent;
    if (parent instanceof Item) return parent.parent;
    return null;
  }

  /**
   * Shortcut to the Item owning the ActiveEffect (if it exists)
   * @type {foundry.documents.Item|null}
   */
  get item() {
    const parent = this.parent.parent;
    return parent instanceof foundry.documents.Item ? parent : null;
  }

  /**
   * Determines if the effect should be ignored based on item state.
   * @type {boolean}
   */
  get isSuppressed() {
    // If it's actors effect not suppressed
    if (!this.item) return false;

    // If it's an Action, it's suppressed by default
    if (this.isAction) return true;

    // Static effects are suppressed if the equippable item isn't equipped.
    if (this.item.system.hasOwnProperty("equipped")) {
      return !this.item.system.equipped;
    }

    //Not suppresed by default
    return false;
  }

  get hasThresholds() {
    const { key, comparator, value } = this.thresholds ?? {};
    return key && comparator && value;
  }

  _evaluateThresholds() {
    const thresholds = this.thresholds ?? {};

    const actor = this.actor;
    if (!actor) return false;

    const currentValue = foundry.utils.getProperty(actor, thresholds.key);
    if (currentValue === undefined) return false;

    const targetValue = foundry.dice.Roll.create(
      thresholds.value,
      actor.getRollData(),
    ).evaluateSync().total;

    const passes = this._evaluateCondition(
      currentValue,
      thresholds.comparator,
      targetValue,
    );

    return !passes;
  }

  /**
   * Helper method to compare two values dynamically
   * @private
   */
  _evaluateCondition(a, op, b) {
    switch (op) {
      case "<":
        return a < b;
      case "<=":
        return a <= b;
      case "==":
        return a == b;
      case ">=":
        return a >= b;
      case ">":
        return a > b;
      case "!=":
        return a != b;
      default:
        return true;
    }
  }

  /**
   * Defines the operational category of the effect.
   * @type {string}
   */
  get category() {
    const type = this.apply === "use" ? "action" : "static";
    const recipient = this.target === "self" ? "Self" : "Target";
    return `${type}${recipient}`;
  }

  /**
   * Helper to identify if this effect requires an explicit action to trigger.
   * @type {boolean}
   */
  get isAction() {
    return this.apply === "use";
  }
}
