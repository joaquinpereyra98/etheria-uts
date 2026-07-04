import { TEMPLATE_PATH } from "../../constants.mjs";
import { DamageData } from "../../data/shared/damage-field.mjs";
import EtheriaItemSheet from "./_item-sheet.mjs";

/**
 * @import {PartContextCallback} from "../_types.mjs";
 */

export default class EtheriaWeaponSheet extends EtheriaItemSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
   actions: {
      createDamage: EtheriaWeaponSheet.#onCreateDamage,
      deleteDamage: EtheriaWeaponSheet.#onDeleteDamage,
    },
  };

  /** @override */
  static PARTS = {
    ...super.PARTS,
    mechanics: {
      template: `${TEMPLATE_PATH}/item-sheet/weapon/mechanics.hbs`,
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
    const fields = ["equipped", "hands", "attribute", "actionType", "range"];

    context.itemFields = fields.reduce((obj, key) => {
      obj[key] = {
        field: system.schema.getField(key),
        value: system[key],
      };
      return obj;
    }, {});
  }

  /**
   * @this {EtheriaWeaponSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onCreateDamage() {
    const existingKeys = Object.keys(this.item.system.damages);

    const existingIndices = existingKeys
      .map((k) => parseInt(k.replace("damage", "")))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    let newIndex = 0;
    while (existingIndices.includes(newIndex)) {
      newIndex++;
    }

    const key = `damage${newIndex}`;

    return this.item.update({
      [`system.damages.${key}`]: new DamageData().toObject(),
    });
  }

  /**
   * @this {EtheriaWeaponSheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onDeleteDamage(_event, target) {
    const { damageId } = target.closest("[data-damage-id]")?.dataset ?? {};
    return this.item.update({ [`system.damages.${damageId}`]: _del });
  }
}
