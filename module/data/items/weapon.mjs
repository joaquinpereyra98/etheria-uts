import { ETHERIA } from "../../config.mjs";
import EtheriaItemData from "./_base-item.mjs";
import FormulaField from "../fields/formula-field.mjs";

export default class EtheriaWeaponData extends EtheriaItemData {
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
