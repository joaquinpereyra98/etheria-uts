import { ASSETS_PATH, DOC_SUB_TYPES } from "../../constants.mjs";
import EtheriaItemData from "./_base-item.mjs";

export default class EtheriaConsumableData extends EtheriaItemData {
   /** @inheritDoc */
    static get metadata() {
      return foundry.utils.mergeObject(super.metadata, {
        icon: "fa-solid fa-flask-round-potion",
        img: `${ASSETS_PATH}/items-icons/drink-me.svg`,
        type: DOC_SUB_TYPES.items.consumable,
      });
    }

  /**@inheritdoc */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema({isEquippable: false}),
      charges: new fields.SchemaField({
        value: new fields.NumberField({ initial: 1, min: 0 }),
        max: new fields.NumberField({ initial: 1, min: 0 })
      }, {label: "Charges"})
    };
  }
}