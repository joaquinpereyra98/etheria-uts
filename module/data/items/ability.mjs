import { ETHERIA } from "../../config.mjs";
import EtheriaItemData from "./_base-item.mjs";
import FormulaField from "../fields/formula-field.mjs";

export default class EtheriaAbilityData extends EtheriaItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema({ isEquippable: false }),
      actionType: new fields.StringField({
       choices: ETHERIA.actionType,
        blank: true,
        label: "Action Type",
      }),
      uses: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, min: 0 }),
        max: new fields.NumberField({ integer: true, min: 0 }),
      }, {label: "Uses"}),
      range: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, min: 0, label: "Range Value"}),
        label: new fields.StringField({ blank: true, label: "Range Label"}),
      }),
      area: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, min: 0, label: "Area Value"}),
        label: new fields.StringField({ blank: true, label: "Area Label"}),
      }),
      rolls: new fields.SchemaField({
        formula: new FormulaField({ deterministic: false }),
        type: new fields.StringField({
          blank: true,
          choices: { ...ETHERIA.damageTypes, ...ETHERIA.healingTypes },
        }),
      }),
    };
  }
}
