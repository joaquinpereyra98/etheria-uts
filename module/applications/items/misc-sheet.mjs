import EtheriaItemSheet from "./_item-sheet.mjs";

/**
 * @import {PartContextCallback} from "../_types.mjs";
 */

export default class EtheriaMiscSheet extends EtheriaItemSheet {

    /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    window: {
      icon: "fa-solid fa-suitcase"
    }
  };

  /** @override */
  static PARTS = {
    ...super.PARTS,
  };
}
