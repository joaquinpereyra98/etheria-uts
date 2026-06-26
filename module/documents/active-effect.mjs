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
  static getDefaultArtwork(effectData = {}) {
    return { img: EtheriaActiveEffect.DEFAULT_ICON };
  }

  /**@inheritdoc */
  async _preCreate(data, options, user) {
    if (!data.img) {
      this.updateSource({
        img: EtheriaActiveEffect.getDefaultArtwork(data)?.img,
      });
    }

    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
  }

  /**@inheritdoc */
  get active() {
    if (this.system.hasThresholds) return this.system._evaluateThresholds();
      return !this.disabled && !this.isSuppressed;
  }
}
