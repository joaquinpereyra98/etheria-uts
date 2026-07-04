import EtheriaRoll from "./roll.mjs";

/**
 * @import { ETHERIA } from "../../config.mjs";
 */

/**
 * @typedef _DamageRollOptions
 * @property {keyof ETHERIA.damageTypes | keyof ETHERIA.healingTypes} damageType - the damage type of this roll;
 */


/**
 * @typedef {import("@client/dice/_types.mjs").RollOptions & _DamageRollOptions} DamageRollOptions
 */

/**
 * A specialized subclass of Roll for handling damage/healing.
 */
export default class DamageRoll extends EtheriaRoll {
  /**
   * @param {string} formula - The damage formula (e.g., "2d6 + 4")
   * @param {object} data - Data for variable substitution
   * @param {DamageRollOptions} [options] - Options including 'type' for damage type
   */
  constructor(formula, data, options = {}) {
    if (options.damageType === "equippedItem") return;
      super(formula, data, options);
    this.options.damageType = options.damageType ?? "untyped";
    this.options.isCritic = !!options.isCritic;
    if (options.damageType) this.#applyDamageFlavor(options.damageType);
  }

  /**
   * Set the flavor term to the formula for the Damage Type
   * @param {keyof ETHERIA.damageTypes | keyof ETHERIA.healingTypes} type 
   * @returns {DamageRoll}
   */
  #applyDamageFlavor(type) {
    if (this._evaluated) {
      throw new Error("Cannot modify the formula of an evaluated Roll.");
    }
    if (!type) return this;

    let cleanFormula = this._formula.replace(/\s*\[.*?\]$/, "").trim();

    const label = CONFIG.ETHERIA.damageTypes[type].label ?? CONFIG.ETHERIA.healingTypes[type].label;
    this._formula = `${cleanFormula} [${label ?? type}]`;

    this.terms = this.constructor.parse(this._formula, this.data);
    return this;
  }

  /**
   * A convenience getter for the damage type
   * @type {string}
   */
  get damageType() {
    return this.options.damageType;
  }

  /**
   * Set the damage type for this roll
   * @param {string} value
   */
  set damageType(value) {
    if (this._evaluated) {
      throw new Error(
        "You cannot change the damage type of an evaluated Roll.",
      );
    }
    this.options.damageType = value;
    return this.applyDamageFlavor();
  }
}
