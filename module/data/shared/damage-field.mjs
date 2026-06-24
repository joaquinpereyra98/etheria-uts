import FormulaField from "../fields/formula-field.mjs";

const { StringField, EmbeddedDataField } = foundry.data.fields;

/**
 * @import { ETHERIA } from "../../config.mjs";
 */

/**
 * Field for storing damage data.
 */
export default class DamageField extends EmbeddedDataField {
  /**
   * @param {foundry.data.types.DataFieldOptions} [options] - Options which configure the behavior of the field
   * @param {foundry.data.types.DataFieldContext} [context] - Additional context which describes the field
   */
  constructor(options = {}, context) {
    const dataClass = options.isAbility ? AbilityDamageData : DamageData;
    super(dataClass, options, context);
  }
}

/* -------------------------------------------- */

/**
 * Data model that stores information on a single damage part.
 * @property {string} formula
 * @property {keyof ETHERIA.damageTypes | keyof ETHERIA.healingTypes} type
 */
export class DamageData extends foundry.abstract.DataModel {
  constructor(data, options) {
    super(data, options);
    /**@type {String} */
    this.formula;
    /**@type {keyof ETHERIA.damageTypes | keyof ETHERIA.healingTypes} */
    this.type;
  }

  /**
   * Get the combined map of available damage and healing type choices.
   * @returns {Record<string, string>}
   */
  static damageTypesChoices() {
    return {
      ...CONFIG.ETHERIA.damageTypes,
      ...CONFIG.ETHERIA.healingTypes,
    };
  }

  /** @override */
  static defineSchema() {
    return {
      formula: new FormulaField({ initial: "1d4" }),
      type: new StringField({
        blank: true,
        choices: this.damageTypesChoices(),
      }),
    };
  }
}

/**
 * Data model that stores information on a single damage part.
 * @property {keyof ETHERIA.damageTypes | keyof ETHERIA.healingTypes | 'equippedItem'} type
 */
export class AbilityDamageData extends DamageData {
  /**@inheritdoc */
  static damageTypesChoices() {
    return {
      equippedItem: "Equipped Item",
      ...super.damageTypesChoices(),
    };
  }
}
