import EtheriaItemSheet from "./_item-sheet.mjs";

/**
 * @import {PartContextCallback} from "../_types.mjs";
 */

export default class EtheriaAbilitySheet extends EtheriaItemSheet {
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
      "actionType",
      "range.value",
      "range.label",
      "area.value",
      "area.label",
    ];

    context.itemFields = fields.reduce((obj, key) => {
      obj[key] = {
        field: system.schema.getField(key),
        value: foundry.utils.getProperty(system, key),
      };
      return obj;
    }, {});

    const resources = ["uses"];
    context.resources = resources.reduce((obj, key) => {
      obj[key] = {
        field: system.schema.getField(key),
        data: system[key],
      };
      return obj;
    }, {});
  }
}
