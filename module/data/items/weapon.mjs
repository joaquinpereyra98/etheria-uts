import { ETHERIA } from "../../config.mjs";
import EtheriaItemData from "./_base-item.mjs";
import FormulaField from "../fields/formula-field.mjs";
import { ASSETS_PATH, DOC_SUB_TYPES } from "../../constants.mjs";

export default class EtheriaWeaponData extends EtheriaItemData {
  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      icon: "fa-solid fa-axe",
      img: `${ASSETS_PATH}/items-icons/battered-axe.svg`,
      type: DOC_SUB_TYPES.items.weapon,
    });
  }

  /**@inheritdoc */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      damageFormula: new FormulaField({
        initial: "1d4",
        deterministic: false,
        label: "Damage Formula",
      }),
      damageType: new fields.StringField({
        choices: ETHERIA.damageTypes,
        label: "Damage Type",
        blank: true,
      }),
      hands: new fields.NumberField({
        initial: 1,
        choices: {
          1: "One Hand",
          2: "Two Hand",
        },
        label: "Hands",
      }),
      attribute: new fields.StringField({
        choices: ETHERIA.attributes,
        blank: true,
        label: "Attribute",
      }),
      actionType: new fields.StringField({
        choices: ETHERIA.actionType,
        blank: true,
        label: "Action Type",
      }),
    };
  }
}
