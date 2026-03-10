import { ETHERIA } from "../../config.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { StringField, EmbeddedDataField } = foundry.data.fields;

/**
 * Field for storing damage data.
 */
export default class DamageField extends EmbeddedDataField {
  /**
   * @param {foundry.data.types.DataFieldOptions} [options] - Options which configure the behavior of the field
   * @param {foundry.data.types.DataFieldContext} [context] - Additional context which describes the field
   */
  constructor(options, context) {
    super(DamageData, options, context);
  }
}

/* -------------------------------------------- */

/**
 * Data model that stores information on a single damage part.
 */
export class DamageData extends foundry.abstract.DataModel {
  constructor(data, options) {
    super(data, options);
    /**@type {String} */
    this.formula;
    /**@type {keyof ETHERIA.damageTypes | keyof ETHERIA.healingTypes} */
    this.type;
  }
  /** @override */
  static defineSchema() {
    return {
      formula: new FormulaField({ initial: "1d4" }),
      type: new StringField({
        blank: true,
        choices: { ...ETHERIA.damageTypes, ...ETHERIA.healingTypes },
      }),
    };
  }
}
