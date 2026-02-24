import { TEMPLATE_PATH } from "../../constants.mjs";
import EtheriaItemSheet from "./_item-sheet.mjs";

/**
 * @import {PartContextCallback, PartListenerCallback} from "../_types.mjs";
 */

export default class EtheriaRaceSheet extends EtheriaItemSheet {
  /** @inheritdoc*/
  static DEFAULT_OPTIONS = {
    actions: {
      removeBoundAbility: EtheriaRaceSheet.#onRemoveBoundAbility,
    },
  };

  /** @override */
  static PARTS = {
    ...super.PARTS,
    mechanics: {
      template: `${TEMPLATE_PATH}/item-sheet/misc/mechanics.hbs`,
      scrollable: [""],
    },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "notes", label: "Notes" },
        { id: "mechanics", label: "Mechanics" },
        { id: "effects", label: "Effects" },
      ],
      initial: "notes",
    },
  };

  /**
   * Prepare render context for the header part.
   * @type {PartContextCallback}
   */
  async _prepareHeaderContext(context, _options) {
    const system = this.item.system;
    const fields = [];

    context.itemFields = fields.reduce((obj, key) => {
      obj[key] = {
        field: system.schema.getField(key),
        value: system[key],
      };
      return obj;
    }, {});
  }

  /**
   * Attach event listeners to Mechanics part.
   * @type {PartListenerCallback}
   */
  _attachMechanicsListeners(htmlElement, _options) {
    /**@type {foundry.applications.elements.HTMLDocumentTagsElement} */
    const documentTags = htmlElement.querySelector(
      "document-tags.etheria-tag-input",
    );
    documentTags.addEventListener("change", (event) => {
      const target = event.target;
      if (!target.value) return;
      const boundAbilities = this.item.system._source.boundAbilities;
      this.item.update({
        "system.boundAbilities": [...boundAbilities, target.value],
      });
    });
  }

  /**
   * Removes a specific bound ability from the item.
   * @this {EtheriaCharacterSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onRemoveBoundAbility(event, target) {
    const { docUuid } = target.closest("[data-doc-uuid]").dataset ?? {};
    if (!event.shiftKey) {
      const confirm = await foundry.applications.api.Dialog.confirm({
        window: { title: "Unbind Ability" },
        content: `<p>Are you sure you want to unbind this ability? <br><small>(Hold <b>Shift</b> to bypass this warning)</small></p>`,
      });
      if (!confirm) return;
    }

    const boundAbilities = this.item.system._source.boundAbilities.filter(
      (u) => u !== docUuid,
    );
    this.item.update({ "system.boundAbilities": boundAbilities });
  }
}
