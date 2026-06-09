import { MODULE_ID, TEMPLATE_PATH } from "../../constants.mjs";

const { handlebars } = foundry.applications;

/**
 * @typedef {Object} EtheriaMessageMetada
 * @property {string} type
 * @property {Record<string, foundry.applications.types.ApplicationClickAction>} actions
 */

/**
 * Base Data Model for all Etheria Chat Message subtypes.
 */
export default class EtheriaBaseMessage extends foundry.abstract.TypeDataModel {
  /**
   * Default metadata for the Message Subtype.
   * @returns {EtheriaMessageMetada}
   * @see {EtheriaBaseMessage#_attachListeners}
   */
  static get metadata() {
    return {
      type: "base",
      actions: {
        toggleAccordion: EtheriaBaseMessage.#onToggleAccordion,
        clickImage: EtheriaBaseMessage.#onClickImage,
      },
    };
  }

  /** @override */
  static defineSchema() {
    const { fields } = foundry.data;
    return {
      actions: new fields.TypedObjectField(
        new fields.SchemaField({
          action: new fields.StringField({ required: true, nullable: false }),
          label: new fields.StringField({ blank: true }),
          icon: new fields.StringField({ blank: true }),
          dataset: new fields.TypedObjectField(
            new fields.StringField({
              required: true,
              nullable: false,
              blank: true,
            }),
          ),
        }),
      ),
    };
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
   * Returns the state object for this specific message.
   * @returns {Record<string, boolean>}
   */
  get _accordionState() {
    return ui.chat[MODULE_ID]?.[this.parent.id] ?? {};
  }

  /**
   * @param {Record<string, boolean>} state
   */
  set _accordionState(state) {
    ui.chat[MODULE_ID] ??= {};
    ui.chat[MODULE_ID][this.parent.id] = state;
  }

  /**
   * Helper to check a specific accordion's state
   * @param {string} key
   * @returns {boolean}
   */
  isExpanded(key) {
    return !!this._accordionState[key];
  }

  /**
   * Subclass-specific context preparation.
   * @param {object} context - The rendering context to be mutated.
   * @returns {Promise<void>}
   */
  async _prepareContext(context) {
    context.system = foundry.utils.deepClone(this);
    context.isOwner = this.parent.isOwner;
    context.isGM = game.user.isGM;
    context.speakerActor = this.parent.speakerActor;
    context.accordionState = this._accordionState;
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
   * Attaches a delegated event listener to the provided element.
   * @param {HTMLElement} element - The container element to attach the listener to.
   * @returns {void}
   */
  _attachListeners(element) {
    const handleAction =
      /** @param {PointerEvent} event */
      (event) => {
        const actionButton = event.target.closest("[data-action]");
        if (!actionButton) return;

        if (event.type === "contextmenu") {
          event.preventDefault();
          event.stopPropagation();
        }

        const { action } = actionButton.dataset;
        const actions = this.constructor.metadata?.actions || {};
        const actionFn = actions[action];

        if (typeof actionFn === "function") {
          actionFn.call(this, event, actionButton);
        }
      };

    element.addEventListener("click", handleAction);
    element.addEventListener("contextmenu", handleAction);
  }

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
    this._attachListeners(element);
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

  /**
   * Toggles the expanded state of the message accordion
   * @this {EtheriaItemMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onToggleAccordion(_event, target) {
    const accordionId = target.dataset.accordionId || "default";
    const currentState = this._accordionState;
    currentState[accordionId] = !currentState[accordionId];

    this._accordionState = currentState;
    target
      .closest(".accordion")
      ?.classList.toggle("expanded", currentState[accordionId]);
  }

  /**
   * Handles the opening of a document sheet from a UI element.
   * @this {EtheriaItemMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onClickImage(event, target) {
    const { uuid } = target.closest("[data-uuid]")?.dataset ?? {};
    if (!uuid) return;

    const doc = await foundry.utils.fromUuid(uuid);
    if (!doc) return;

    if (event.type === "contextmenu" || event.button === 2) {
      if (
        doc instanceof foundry.documents.TokenDocument &&
        doc.object?.isVisible
      ) {
        canvas.animatePan({
          x: doc.object.x,
          y: doc.object.y,
          scale: Math.max(
            canvas.stage.scale.x,
            canvas.dimensions.scale.default,
          ),
        });
      } else if (doc.sheet && (doc.visible ?? true)) {
        doc.sheet.render(true);
      }
      return;
    }

    const src = doc.img || doc.prototypeToken?.texture?.src;
    if (!src) return;
    const title = doc.name || "Image";

    new foundry.applications.apps.ImagePopout({
      src,
      uuid,
      window: { title },
    }).render({ force: true });
  }
}
