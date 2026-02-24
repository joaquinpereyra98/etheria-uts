export default class EtheriaItem extends foundry.documents.Item.implementation {
  /**@inheritdoc */
  static getDefaultArtwork(itemData = {}) {
    const img =
      CONFIG.Item.dataModels[itemData.type]?.metadata?.img ??
      foundry.documents.Item.implementation.DEFAULT_ICON;

    return { img };
  }
}
