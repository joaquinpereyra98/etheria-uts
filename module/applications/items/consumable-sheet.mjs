import EtheriaItemSheet from "./_item-sheet.mjs";

/**
 * @import {PartContextCallback} from "../_types.mjs";
 */

export default class EtheriaConsumableSheet extends EtheriaItemSheet {
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
    const resources = ["charges"];
    context.resources = resources.reduce((obj, key) => {
      obj[key] = {
        field: system.schema.getField(key),
        data: system[key],
      };
      return obj;
    }, {})
  }
}
