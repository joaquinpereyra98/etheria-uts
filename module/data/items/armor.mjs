import { ETHERIA } from "../../config.mjs";
import EtheriaItemData from "./_base-item.mjs";

export default class EtheriaArmorData extends EtheriaItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      armorValue: new fields.NumberField({
        initial: 0,
        min: 0,
        integer: true,
        label: "Armor",
      }),
      armorType: new fields.StringField({
        choices: ETHERIA.armorType,
        label: "Type",
        blank: false,
        required: true,
        nullable: false,
      }),
      requirementAttribute: new fields.StringField({
        blank: true,
        choices: ETHERIA.attributes,
        label: "Required Attribute",
      }),
      requirementValue: new fields.NumberField({
        min: 0,
        integer: true,
        label: "Required Value",
      }),
      movementPenalty: new fields.NumberField({
        min: 0,
        integer: true,
        label: "Mov. Penalty",
      }),
    };
  }
}
