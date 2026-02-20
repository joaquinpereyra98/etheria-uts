import EtheriaItemSheet from "./_item-sheet.mjs";

/**
 * @import {PartContextCallback} from "../_types.mjs";
 */

export default class EtheriaArmorSheet extends EtheriaItemSheet {
  /** @override */
  static PARTS = {
    ...super.PARTS,
  };

  /**
   * Prepare render context for the header part.
   * @type {PartContextCallback}
   */
  async _prepareHeaderContext(context, _options) {
    const system = this.item.system;
    const fields = [
      "isEquipped",
      "damageFormula",
      "damageType",
      "hands",
      "attribute",
      "actionType",
    ];

    context.itemFields = fields.reduce((obj, key) => {
      obj[key] = {
        field: system.schema.getField(key),
        value: system[key],
      };
      return obj;
    }, {});
  }
}
