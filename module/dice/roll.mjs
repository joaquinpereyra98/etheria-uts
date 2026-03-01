import { DOC_SUB_TYPES } from "../constants.mjs";

export default class EtheriaRoll extends foundry.dice.Roll {
  /**
   * Transform a Roll instance into a ChatMessage, displaying the roll result.
   * This function can either create the ChatMessage directly, or return the data object that will be used to create.
   *
   * @param {object} messageData          The data object to use when creating the message
   * @param {object} [options]            Additional options which modify the created message.
   * @param {string} [options.rollMode]   The template roll mode to use for the message from CONFIG.Dice.rollModes
   * @param {boolean} [options.create=true]   Whether to automatically create the chat message, or only return the
   *                                          prepared chatData object.
   * @returns {Promise<ChatMessage|object>} A promise which resolves to the created ChatMessage document if create is
   *                                        true, or the Object of prepared chatData otherwise.
   */
  async toMessage(messageData = {}, {rollMode, create=true}={}) {
    if (rollMode === "roll") rollMode = undefined;
    rollMode ||= game.settings.get("core", "rollMode");

    if (!this._evaluated)
      await this.evaluate({
        allowInteractive: rollMode !== CONST.DICE_ROLL_MODES.BLIND,
      });

    messageData = foundry.utils.mergeObject(
      {
        author: game.user.id,
        sound: CONFIG.sounds.dice,
        type: DOC_SUB_TYPES.messages.roll,
      },
      messageData,
    );

    messageData.rolls = [this];

    const cls = foundry.utils.getDocumentClass("ChatMessage");
    const msg = new cls(messageData);
    msg.applyRollMode(rollMode);

    if (create) return cls.create(msg);
    return msg.toObject();
  }
}
