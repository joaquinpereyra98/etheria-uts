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
    };
  }

  /**@inheritdoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preUpdate(data, options, user);
    if (allowed === false) return false;

    if (this.item) {
      if (this.item.type === DOC_SUB_TYPES.items.consumable && !data.apply) {
        updates.apply = "use";
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
    if (!this.item) return false;
    if (this.target === "targets") return true;

    const isPassive = this.apply === "equip";
    const notEquipped = !this.item.system.equipped;

    return isPassive && notEquipped;
  }
}
