import { DOC_SUB_TYPES } from "../../constants.mjs";
import EtheriaItemData from "./_base-item.mjs";
import BoundAbilitiesMixin from "./mixins/bound-abilities-mixin.mjs";

export default class EtheriaMiscData extends BoundAbilitiesMixin(
  EtheriaItemData,
) {
  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      icon: "fa-solid fa-suitcase",
      type: DOC_SUB_TYPES.items.misc,
    });
  }

  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
    };
  }
}
