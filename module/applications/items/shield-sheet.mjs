import { TEMPLATE_PATH } from "../../constants.mjs";
import { DamageData } from "../../data/shared/damage-field.mjs";
import EtheriaItemSheet from "./_item-sheet.mjs";

/**
 * @import {PartContextCallback} from "../_types.mjs";
 */

export default class EtheriaWeaponSheet extends EtheriaItemSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {},
  };

  /** @override */
  static PARTS = {
    ...super.PARTS,
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "notes", label: "Notes" },
        { id: "effects", label: "Effects" },
      ],
      initial: "notes",
    },
  };

  /**
   * Prepare render context for the header part.
   * @type {PartContextCallback}
   */
  async _prepareHeaderContext(context, _options) {
    const system = this.item.system;
    const fields = ["equipped","block"];

    context.itemFields = fields.reduce((obj, key) => {
      obj[key] = {
        field: system.schema.getField(key),
        value: system[key],
      };
      return obj;
    }, {});
  }
}
