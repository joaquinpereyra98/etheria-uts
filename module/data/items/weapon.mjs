import EtheriaItemData from "./_base-item.mjs";
import { ASSETS_PATH, DOC_SUB_TYPES } from "../../constants.mjs";
import DamageField from "../shared/damage-field.mjs";
import FormulaField from "../fields/formula-field.mjs";

export default class EtheriaWeaponData extends EtheriaItemData {
  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      icon: "fa-solid fa-axe",
      img: `${ASSETS_PATH}/items-icons/battered-axe.svg`,
      type: DOC_SUB_TYPES.items.weapon,
      hasAccuracyRoll: true,
    });
  }

  /**@inheritdoc */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      damages: new fields.TypedObjectField(new DamageField()),
      hands: new fields.NumberField({
        initial: 1,
        choices: {
          1: "One Hand",
          2: "Two Hand",
        },
        label: "Hands",
      }),
      range: new FormulaField({
        blank: true,
        label: "Range",
        deterministic: true,
      }),
      attribute: new fields.StringField({
        choices: CONFIG.ETHERIA.attributes,
        blank: true,
        label: "Attribute",
      }),
      actionType: new fields.StringField({
        choices: CONFIG.ETHERIA.actionType,
        blank: true,
        label: "Action Type",
      }),
    };
  }
}
