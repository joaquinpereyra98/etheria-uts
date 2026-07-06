import { MODULE_ID, TEMPLATE_PATH } from "../../constants.mjs";

const PANEL_TEMPLATES = `${TEMPLATE_PATH}/actions-panel`;

const { Application, HandlebarsApplicationMixin: HAM } =
  foundry.applications.api;

export default class ActionsPanel extends HAM(Application) {
  /* -------------------------------------------- */
  /* Static Properties & Methods                  */
  /* -------------------------------------------- */

  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-actions-panel`,
    tag: "aside",
    classes: [MODULE_ID, "actions-panel"],
    window: {
      frame: false,
      positioned: false,
    },
    actions: {
      changeValue: {
        handler: ActionsPanel.#onChangeValue,
        buttons: [0, 2],
      },
      clickImage: {
        handler: ActionsPanel.#onClickImage,
        buttons: [0, 2],
      },
      glowPanel: ActionsPanel.#onGlowPanel,
      toggleAccordion: ActionsPanel.#onToggleAccordion,
    },
  };

  static registerSetting() {
    game.settings.register(MODULE_ID, "glowPanelIDs", {
      scope: "world",
      config: false,
      type: Array,
      default: [],
      onChange: () => ui[`${MODULE_ID}.ActionsPanel`].render(),
    });
  }

  /**@type {Stirng[]} */
  get glowIds() {
    return game.settings.get(MODULE_ID, "glowPanelIDs") ?? [];
  }
  /**@param {String[]} array */
  set glowIds(array) {
    return game.settings.set(MODULE_ID, "glowPanelIDs", array);
  }

  /** @override */
  static PARTS = {
    body: {
      template: `${PANEL_TEMPLATES}/body.hbs`,
      templates: [`${PANEL_TEMPLATES}/character-panel.hbs`],
    },
  };

  #listEl;
  #scrollbarEl;
  #thumbEl;

  /**@type {Boolean} */
  get _expanded() {
    return !!game.user.getFlag(MODULE_ID, "expandedActionPanel");
  }

  /**@override */
  _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else {
      const players = document.getElementById("players");
      if (players) players.insertAdjacentElement("beforebegin", element);
      else document.getElementById("ui-left-column-1")?.append(element);
    }
  }

  /**
   * Sync the actions panel width with the actor panel width
   * @private
   */
  #syncActionsPanelWidth() {
    const characterPanel = this.element.querySelector(".character-panel");
    characterPanel.children
    
    if (characterPanel) {
      const width = Array.from(characterPanel.children).reduce(
        (acc, el) => acc + el.getBoundingClientRect().width,
        10,
      );
      this.element.style.setProperty("--actor-panel-width", `${width}px`);
    }
  }

  #updateThumbSize() {
    if (!this.#listEl || !this.#thumbEl) return;
    const scrollRatio = this.#listEl.clientHeight / this.#listEl.scrollHeight;
    this.#thumbEl.style.height = `${Math.max(this.#listEl.clientHeight * scrollRatio, 30)}px`;
  }

  #syncFakeScrollbar() {
    if (!this.#listEl || !this.#scrollbarEl || !this.#thumbEl) return;
    const maxContentScroll =
      this.#listEl.scrollHeight - this.#listEl.clientHeight;
    const maxThumbScroll =
      this.#scrollbarEl.clientHeight - this.#thumbEl.clientHeight;

    const scrollPercentage = this.#listEl.scrollTop / maxContentScroll;
    this.#thumbEl.style.transform = `translateY(${scrollPercentage * maxThumbScroll}px)`;
  }

  /**@inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#syncActionsPanelWidth();

    this.#listEl = this.element.querySelector(".ui-frame-list");
    this.#scrollbarEl = this.element.querySelector(".left-scroll");
    this.#thumbEl = this.#scrollbarEl?.querySelector(".fake-thumb");

    if (this.#listEl) {
      this.#listEl.addEventListener("scroll", () => this.#syncFakeScrollbar());
      window.addEventListener("resize", () => {
        this.#updateThumbSize();
        this.#syncFakeScrollbar();
      });
      this.#updateThumbSize();
      this.#syncFakeScrollbar();
    }
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const characters = [
      ...new Set(
        game.users
          .filter((u) => u.active && u.character)
          .map((u) => u.character),
      ),
    ];

    return {
      ...context,
      config: CONFIG.ETHERIA,
      characters,
      isGM: game.user.isGM,
      glowPanels: this.glowIds.reduce((acc, id) => {
        acc[id] = true;
        return acc;
      }, {}),
      expanded: this._expanded,
    };
  }

  /**
   * @this {ActionsPanel}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onChangeValue(event, target) {
    const { key } = target.dataset;
    const path = `system.actions.${key}`;
    const { uuid } = target.closest(".character-panel")?.dataset ?? {};
    const actor = await foundry.utils.fromUuid(uuid);
    if (!actor) return;

    const change = event.button === 2 ? +1 : -1;
    const { value, max } = foundry.utils.getProperty(actor.toObject(), path);

    return await actor.update({
      [`${path}.value`]: Math.clamp(value + change, 0, max),
    });
  }

  /**
   * andle header control button clicks to display actor portrait artwork or open actor sheet.
   * @this {ActionsPanel}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onClickImage(event, target) {
    const { uuid } = target.closest(".character-panel")?.dataset ?? {};
    const actor = await foundry.utils.fromUuid(uuid);
    if (!actor) return;

    if (event.button === 2) {
      actor.sheet.render({ force: true });
    } else {
      new foundry.applications.apps.ImagePopout({
        src: actor.img,
        uuid,
        window: { title: actor.name },
      }).render({
        force: true,
      });
    }
  }

  /**
   *
   * @this {ActionsPanel}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onGlowPanel(event, target) {
    const { uuid } = target.closest(".character-panel")?.dataset ?? {};
    const actor = await foundry.utils.fromUuid(uuid);
    if (!actor) return;

    const validCharacterIds = game.users
      .map((u) => u.character?.id)
      .filter(Boolean);

    let setting = this.glowIds.filter((id) => validCharacterIds.includes(id));

    if (setting.includes(actor.id)) {
      setting = setting.filter((id) => id !== actor.id);
    } else {
      setting.push(actor.id);
    }

    this.glowIds = setting;
  }

  /**
   *
   * @this {ActionsPanel}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onToggleAccordion(_) {
    const state = !this._expanded;
    await game.user.setFlag(MODULE_ID, "expandedActionPanel", state);

    this.element
      .querySelector(".accordion-wrapper")
      ?.classList.toggle("expanded", state);

    if (state) {
      setTimeout(() => this.#syncActionsPanelWidth(), 300);
    }
  }
}
