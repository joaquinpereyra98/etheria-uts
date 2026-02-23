import { TEMPLATE_PATH } from "../../constants.mjs";
import { DamageData } from "../../data/shared/damage-field.mjs";
import EtheriaItemSheet from "./_item-sheet.mjs";

/**
 * @import {PartContextCallback} from "../_types.mjs";
 */

export default class EtheriaAbilitySheet extends EtheriaItemSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    window: {
      icon: "fa-solid fa-meteor",
    },
    actions: {
      createDamage: EtheriaAbilitySheet.#onCreateDamage,
      deleteDamage: EtheriaAbilitySheet.#onDeleteDamage,
    },
  };

  /** @override */
  static PARTS = {
    ...super.PARTS,
    mechanics: {
      template: `${TEMPLATE_PATH}/item-sheet/ability/mechanics.hbs`,
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
    const fields = ["actionType", "range", "area"];

    context.itemFields = fields.reduce((obj, key) => {
      obj[key] = {
        field: system.schema.getField(key),
        value: foundry.utils.getProperty(system, key),
      };
      return obj;
    }, {});

    const resources = ["uses"];
    context.resources = resources.reduce((obj, key) => {
      obj[key] = {
        field: system.schema.getField(key),
        data: system[key],
      };
      return obj;
    }, {});
  }

  /**
   * Prepare render context for the header part.
   * @type {PartContextCallback}
   */
  async _prepareMechanicsContext(context, _options) {
    const actor = this.actor;
    if (actor && actor.system.getResourcesChoices) {
      context.resourcesChoices = actor.system.getResourcesChoices();
    }
  }

  /**
   * @this {EtheriaAbilitySheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onCreateDamage() {
    const existingKeys = Object.keys(this.item.system.damages);

    const existingIndices = existingKeys
      .map((k) => parseInt(k.split("-")[1]))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    let newIndex = 0;
    while (existingIndices.includes(newIndex)) {
      newIndex++;
    }

    const key = `damage-${newIndex}`;

    return this.item.update({
      [`system.damages.${key}`]: new DamageData().toObject(),
    });
  }

  /**
   * @this {EtheriaAbilitySheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onDeleteDamage(_event, target) {
    const { damageId } = target.closest("[data-damage-id]")?.dataset ?? {};
    return this.item.update({ [`system.damages.-=${damageId}`]: null });
  }
}
