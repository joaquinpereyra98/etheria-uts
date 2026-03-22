import { ETHERIA } from "../../config.mjs";
import { DOC_SUB_TYPES } from "../../constants.mjs";

export default class EtheriaBaseEffect extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      apply: new fields.StringField({
        label: "Apply on",
        hint: "Determines the trigger for this effect",
        required: true,
        blank: false,
        choices: ETHERIA.applyEffect,
        initial: "equip",
      }),

      target: new fields.StringField({
        label: "Apply to",
        hint: "Defines the recipient of the effect",
        required: true,
        blank: false,
        choices: ETHERIA.targetEffect,
        initial: "self",
      }),

      stacks: new fields.NumberField({
        required: true,
        integer: false,
        positive: false,
        min: 0,
        label: "Stacks",
        hint: "Current intensity of the effect."
      }),
    };
  }

  /**@inheritdoc */
  async _preCreate(data = {}, options = {}, user) {
    const allowed = await super._preUpdate(data, options, user);
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
    return this.parent.parent instanceof foundry.documents.Actor
      ? this.parent.parent
      : null;
  }

  /**
   * Shortcut to the Item owning the ActiveEffect (if it exists)
   * @type {foundry.documents.Item|null}
   */
  get item() {
    return this.parent.parent instanceof foundry.documents.Item
      ? this.parent.parent
      : null;
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
