import { DOC_SUB_TYPES } from "../constants.mjs";

export default class EtheriaRoll extends foundry.dice.Roll {
  /**
   * Transform a Roll instance into a ChatMessage, displaying the roll result.
   * This function can either create the ChatMessage directly, or return the data object that will be used to create.
   *
   * @param {object} messageData            The data object to use when creating the message
   * @param {object} [options]              Additional options which modify the created message.
   * @param {string} [options.messageMode]    A message visibility mode to apply to the resulting message from CONFIG.ChatMessage.modes.
   * @param {boolean} [options.create=true]   Whether to automatically create the chat message, or only return the
   * prepared chatData object.
   * @returns {Promise<ChatMessage|object>} A promise which resolves to the created ChatMessage document if create is
   * true, or the Object of prepared chatData otherwise.
   */
  async toMessage(
    messageData = {},
    { messageMode, rollMode, create = true } = {},
  ) {

    if (rollMode) {
      foundry.utils.logCompatibilityWarning(
        "The rollMode option of Roll#toMessage is deprecated in favor of" +
          " messageMode, a string value in CONFIG.ChatMessage.modes",
        { since: 14, until: 16 },
      );
      messageMode = this.constructor._mapLegacyRollMode(rollMode);
    }

    messageMode ||= game.settings.get("core", "messageMode");

    if (!this._evaluated) {
      await this.evaluate({ allowInteractive: messageMode !== "blind" });
    }

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
    msg.applyMode(messageMode);

    if (create) return cls.create(msg);
    return msg.toObject();
  }
}
