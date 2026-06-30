import EtheriaItemData from "./_base-item.mjs";
import { ASSETS_PATH, DOC_SUB_TYPES } from "../../constants.mjs";

export default class EtheriaShielddData extends EtheriaItemData {
  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      icon: "fa-chisel fa-regular fa-shield",
      img: `${ASSETS_PATH}/items-icons/viking-shield.svg`,
      type: DOC_SUB_TYPES.items.shield,
    });
  }

  /**@inheritdoc */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      block: new fields.NumberField({
        initial: 0,
        integer: true,
        label: "Block",
      }),
    };
  }
}
