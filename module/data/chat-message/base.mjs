import { MODULE_ID, TEMPLATE_PATH } from "../../constants.mjs";

const { handlebars } = foundry.applications;

/**
 * Base Data Model for all Etheria Chat Message subtypes.
 * Provides a standardized frame, header, and enrichment logic.
 */
export default class EtheriaBaseMessage extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const { StringField } = foundry.data.fields;

    return {
      ...this._defineSchema(),
      flavor: new StringField({ required: true, initial: "" }),
    };
  }

  /**
   * Internal schema definition for subclasses to override.
   * @returns {foundry.abstract.types.DataSchema}
   */
  static _defineSchema() {
    return {};
  }

  /**
   * @type {foundry.documents.ChatMessage}
   */
  get document() {
    return this.parent;
  }

  /* -------------------------------------------------- */
  /* Rendering                                          */
  /* -------------------------------------------------- */

  /**
   * Subclass-specific context preparation.
   * @param {object} context - The rendering context to be mutated.
   * @returns {Promise<void>}
   */
  async _prepareContext(context) {
    return context;
  }

  /**
   * Subclass-specific HTML injection.
   * @param {HTMLElement} element - The LI element of the message.
   * @param {object} context - The prepared rendering context.
   * @returns {Promise<void>}
   */
  async _renderHTML(element, context) {}

  /**
   * The core rendering entry point for the Chat Log.
   * @param {object} [options] - Rendering options.
   * @param {string} [options.borderColor] - A custom CSS color for the message border.
   * @returns {Promise<HTMLElement>} - The fully constructed LI element.
   */
  async renderHTML(options = {}) {
    const element = this.#renderFrame(options);

    const context = {
      ...options,
      document: this.document,
      actor: this.document.speakerActor,
      user: game.user,
      rollData: this.document.getRollData?.(),
      isWhisper: this.document.whisper.length,
      whisperTo: this.document.whisper
        .map((u) => game.users.get(u)?.name)
        .filterJoin(", "),
      canUpdate: this.document.canUserModify(game.user, "update"),
    };

    await this._prepareContext(context);

    element.insertAdjacentHTML("beforeend", await this._renderHeader(context));

    if (context.document.content) {
      const enriched = await CONFIG.ux.TextEditor.enrichHTML(
        context.document.content,
        {
          rollData: context.rollData,
          relativeTo: context.actor,
        },
      );

      element.insertAdjacentHTML(
        "beforeend",
        `<section data-message-part="content">${enriched}</section>`,
      );
    }

    await this._renderHTML(element, context);
    return element;
  }

  /**
   * Renders the standard message header.
   * @param {object} context
   * @returns {Promise<string>}
   */
  async _renderHeader(context) {
    const template = `${TEMPLATE_PATH}/chat-messages/header.hbs`;
    return await handlebars.renderTemplate(template, context);
  }

  /**
   * Render the frame (the LI element) of the chat message.
   * @param {object} options
   * @returns {HTMLLIElement}
   */
  #renderFrame(options) {
    const frame = document.createElement("LI");
    const { blind, id, style, whisper } = this.document;
    frame.dataset.messageId = id;

    const cssClasses = [
      MODULE_ID,
      "chat-message",
      "message",
      "flexcol",
      style === CONST.CHAT_MESSAGE_STYLES.IC ? "ic" : null,
      style === CONST.CHAT_MESSAGE_STYLES.EMOTE ? "emote" : null,
      whisper.length ? "whisper" : null,
      blind ? "blind" : null,
    ];
    for (const cssClass of cssClasses)
      if (cssClass) frame.classList.add(cssClass);
    if (options.borderColor)
      frame.style.setProperty("border-color", options.borderColor);
    return frame;
  }
}
