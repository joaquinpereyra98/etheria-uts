import { MODULE_ID } from "../../constants.mjs";

export default class ActionBar extends foundry.applications.api.Application {
  /* -------------------------------------------- */
  /* Static Properties & Methods                  */
  /* -------------------------------------------- */

  /** @type {foundry.applications.types.ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-action-bar`,
    tag: "section",
    classes: [MODULE_ID, "action-bar"],
    window: {
      frame: false,
      positioned: false,
    },
    actions: {
      abilityDialog: ActionBar.#onAbilityDialog,
      secondariesDialog: ActionBar.#onSecondariesDialog,
    },
  };

  /** @override */
  async _renderHTML(_context, _options) {
    const div = document.createElement("div");
    const abilityButton = document.createElement("button");
    abilityButton.type = "button";
    abilityButton.classList.add("ability-button");
    abilityButton.dataset.action = "abilityDialog";

    const secondariesButton = document.createElement("button");
    secondariesButton.type = "button";
    secondariesButton.classList.add("secondaries-button");
    secondariesButton.dataset.action = "secondariesDialog";

    div.append(abilityButton, secondariesButton);
    return div;
  }

  /**
   * @override
   * @param {HTMLElement} result
   * @param {HTMLElement} content
   */
  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }

  /**@override */
  _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else {
      const parent = document.getElementById("ui-bottom");
      parent.prepend(element);
    }
  }

  /**@inheritdoc */
  async _onRender(_context, _options) {
    const hotbar = document.getElementById("hotbar");
    const actionBar = this.element;

    if (hotbar && actionBar) {
      const observer = new MutationObserver(() => {
        const offset = getComputedStyle(hotbar).getPropertyValue("--offset");
        actionBar.style.setProperty("--offset", offset);
      });

      observer.observe(hotbar, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }
  }

  /**
   * @this {ActionBar}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onAbilityDialog() {
    const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

    if (!actor) {
      ui.notifications.warn(
        "No character selected. Please select a token or assign a character to your user profile.",
      );
      return;
    }

    if (!actor.isOwner) {
      ui.notifications.error(
        "You do not have permission to use abilities for this actor.",
      );
      return;
    }

    return actor.openAbilitiesDialog();
  }

  /**
   * @this {ActionBar}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onSecondariesDialog() {
    const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

    if (!actor) {
      ui.notifications.warn(
        "No character selected. Please select a token or assign a character to your user profile.",
      );
      return;
    }

    if (!actor.isOwner) {
      ui.notifications.error(
        "You do not have permission to use abilities for this actor.",
      );
      return;
    }

    return actor.openSecondariesDialog();
  }
}
