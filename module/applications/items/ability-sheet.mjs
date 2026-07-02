import { TEMPLATE_PATH } from "../../constants.mjs";
import { DamageData } from "../../data/shared/damage-field.mjs";
import EtheriaItemSheet from "./_item-sheet.mjs";

/**
 * @import {PartContextCallback} from "../_types.mjs";
 */

export default class EtheriaAbilitySheet extends EtheriaItemSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      createDamage: EtheriaAbilitySheet.#onCreateDamage,
      createCost: EtheriaAbilitySheet.#onCreateCost,
      deleteDamage: EtheriaAbilitySheet.#onDeleteDamage,
      deleteCost: EtheriaAbilitySheet.#onDeleteCost,
    },
  };

  /** @inheritdoc */
  get isEditable() {
    return super.isEditable && game.user.isGM;
  }

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

  /**@inheritdoc */
  _prepareTabs(group) {
    if (group === "primary" && !game.user.isGM)
      this.tabGroups.primary = "notes";
    return super._prepareTabs(group);
  }

  /**@override */
  _getTabsConfig(group) {
    const config = this.constructor.TABS[group];
    if (!config) return null;

    if (group === "primary" && !game.user.isGM) {
      config.tabs = [{ id: "notes", label: "Notes" }];
    }

    return config;
  }

  /**@inheritdoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if (!game.user.isGM) {
      options.parts = ["header", "notes"];
    }
  }

  /**
   * Prepare render context for the header part.
   * @type {PartContextCallback}
   */
  async _prepareHeaderContext(context, _options) {
    const system = this.item.system;
    const fields = ["actionType", "range", "area", "attribute"];

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
    context.costFields = {
      value: this.item.system.schema.getField("costs.element.value"),
      resource: this.item.system.schema.getField("costs.element.resource"),
    };

    if (actor && actor.system.getResourcesChoices) {
      const choices = actor.system.getResourcesChoices();
      const choicesChosen = Object.values(this.item.system.costs).map(
        (c) => c.value,
      );

      context.resourcesChoices = Object.fromEntries(
        Object.entries(choices).filter(([key]) => !choicesChosen.includes(key)),
      );
    }

    context.costs = Object.entries(this.item.system.costs).map(([k, value]) => ({
      id: k,
      name: `system.costs.${k}`,
      value
    }))
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
  static #onCreateCost() {
    const existingKeys = Object.keys(this.item.system.costs);

    const existingIndices = existingKeys
      .map((k) => parseInt(k.split("-")[1]))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    let newIndex = 0;
    while (existingIndices.includes(newIndex)) {
      newIndex++;
    }

    const key = `cost-${newIndex}`;

    return this.item.update({
      [`system.costs.${key}`]: { resource: "" },
    });
  }

  /**
   * @this {EtheriaAbilitySheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onDeleteDamage(_event, target) {
    const { damageId } = target.closest("[data-damage-id]")?.dataset ?? {};
    return this.item.update({ [`system.damages.${damageId}`]: _del });
  }

  /**
   * @this {EtheriaAbilitySheet}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static #onDeleteCost(_event, target) {
    const { costId } = target.closest("[data-cost-id]")?.dataset ?? {};
    console.log(costId)
    return this.item.update({ [`system.costs.${costId}`]: _del });
  }
}
