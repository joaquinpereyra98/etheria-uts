import { ASSETS_PATH, DOC_SUB_TYPES } from "../constants.mjs";

export default class EtheriaItem extends foundry.documents.Item.implementation {
  /**@inheritdoc */
  static getDefaultArtwork(itemData = {}) {
    let icon;

    const itemTypes = DOC_SUB_TYPES.items;
    switch (itemData.type) {
      case itemTypes.ability:
        icon = `${ASSETS_PATH}/items-icons/fire-ray.svg`;
        break;
      case itemTypes.armor:
        icon = `${ASSETS_PATH}/items-icons/breastplate.svg`;
        break;
      case itemTypes.consumable:
        icon = `${ASSETS_PATH}/items-icons/drink-me.svg`;
        break;
      case itemTypes.weapon:
        icon = `${ASSETS_PATH}/items-icons/battered-axe.svg`;
        break;
      default:
        icon = this.DEFAULT_ICON;
        break;
    }

    return { img: icon };
  }
}
