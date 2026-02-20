export default class EtheriaActiveEffect
  extends foundry.documents.ActiveEffect.implementation
{
  /**
   * The default icon used for newly created ActiveEffects documents
   * @type {string}
   */
  static DEFAULT_ICON = "icons/svg/aura.svg";

  /**
   * Determine default artwork based on the provided ActiveEffect data.
   * @param {Partial<foundry.documents.types.ActiveEffectData>} effectData - The source item data.
   * @returns {{img: string}} - Candidate ActiveEffect image.
   */
  static getDefaultArtwork(effectData) {
    return { img: this.DEFAULT_ICON };
  }
}
