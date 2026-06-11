import EtheriaItemData from "./_base-item.mjs";
import { ASSETS_PATH, DOC_SUB_TYPES } from "../../constants.mjs";

export default class EtheriaArmorData extends EtheriaItemData {
  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      icon: "fa-solid fa-helmet-battle",
      img: `${ASSETS_PATH}/items-icons/breastplate.svg`,
      type: DOC_SUB_TYPES.items.armor,
    });
  }

  /**@inheritdoc */
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
        choices: CONFIG.ETHERIA.armorType,
        label: "Type",
        blank: true,
      }),
      requirementAttribute: new fields.StringField({
        blank: true,
        choices: CONFIG.ETHERIA.attributes,
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
