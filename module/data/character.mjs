const { TypeDataModel } = foundry.abstract;
import {
  createResistancesFields,
  createSphereFields,
  createAttributesFields,
  createSkillsFields,
} from "./utils.mjs";

import { defineValueGetter } from "../utils.mjs";
import { LocalDocumentField, FormulaField } from "./fields/_module.mjs";
import { ResourceSchemaField } from "./shared/_module.mjs";
import { ETHERIA } from "../config.mjs";

/**
 * @typedef {object} MyCoolSchema
 * @property {number} level
 * @property {exhaustion} exhaustion
 */

/**
 * @extends {foundry.abstract.TypeDataModel<MyCoolSchema, foundry.documents.Actor>}
 */
export default class EtheriaCharacterData extends TypeDataModel {
  static defineSchema() {
    const { fields } = foundry.data;

    return {
      level: new fields.NumberField({ initial: 1, min: 1, label: "Level" }),
      exhaustion: new fields.NumberField({ initial: 0, min: 0 }),
      race: new LocalDocumentField(foundry.documents.Item, { fallback: false }),

      resources: new fields.SchemaField({
        hp: new ResourceSchemaField({
          schemaOptions: { label: "Health Points" },
        }),
        stamina: new ResourceSchemaField({
          schemaOptions: { label: "Stamina" },
          valueOptions: { min: 0 },
          maxOptions: { min: 0 },
        }),
        armor: new ResourceSchemaField({
          schemaOptions: { label: "Armor" },
          valueOptions: { min: 0 },
          maxOptions: { min: 0, nullable: true, initial: null },
        }),
      }),

      resourcesExtra: new fields.TypedObjectField(
        new ResourceSchemaField({
          maxOptions: { min: 0, nullable: true, initial: null },
          customLabel: true,
        }),
      ),

      advancementRoll: new fields.SchemaField({
        health: new FormulaField({
          deterministic: false,
          label: "Health Dice",
        }),
        resource: new FormulaField({
          deterministic: false,
          label: "Resource Dice",
        }),
      }),

      skills: new fields.SchemaField(createSkillsFields({ min: 0 })),

      attributes: new fields.SchemaField(createAttributesFields({ min: 0 })),

      bonus: new fields.SchemaField({
        accuracy: new fields.NumberField({ integer: true, initial: 0 }),
        physicalDamage: new fields.NumberField({ integer: true, initial: 0 }),
        magicDamage: new fields.NumberField({ integer: true, initial: 0 })
      }),

      resistances: new fields.SchemaField(createResistancesFields({ min: 0 })),

      magicSpheres: new fields.SchemaField(createSphereFields({ min: 0 })),

      details: new fields.SchemaField({
        isCaster: new fields.BooleanField({ initial: false }),
      }),
    };
  }

  /**@override */
  prepareBaseData() {
    const defineStat = (stat, name, getter) => {
      this[stat] ??= {};
      this[stat][name] = { override: null, mod: 0 };
      defineValueGetter(this[stat][name], getter);
    };

    defineStat("recovers", "stamina", () => this.#staminaRecovery());
    defineStat("recovers", "mana", () => this.#manaRecovery());

    defineStat("defense", "block", () => this.#calculateDefense("block"));
    defineStat("defense", "parry", () => this.#calculateDefense("dodge"));
    defineStat("defense", "dodge", () => this.#calculateDefense("parry"));

    this.defense.block.skill = "endurance";
    this.defense.block.attribute = "strength";

    this.defense.parry.skill = "concentration";
    this.defense.parry.attribute = "agility";

    this.defense.dodge.skill = "reflex";
    this.defense.dodge.attribute = "agility";

    for (const [key, skill] of Object.entries(this.skills)) {
      const attrKey = ETHERIA.skills[key].attribute;
      skill.attribute = attrKey;
      Object.defineProperty(skill, "total", {
        get: () => skill.value + (this.attributes[attrKey]?.mod ?? 0),
        configurable: true,
      });
    }
  }

  /**@override */
  prepareDerivedData() {
    for (const [key, attribute] of Object.entries(this.attributes)) {
      this.attributes[key].mod = this.#calcModifer(attribute.value);
    }
  }

  /**
   * Calculates combat defense stats.
   * @param {"block"|"parry"|"dodge"} type - The defense type to calculate.
   * @returns {number} The final calculated defense value.
   */
  #calculateDefense(type) {
    const defenseData = this.defense[type];
    const attributes = this.attributes;
    const exhaustionPenalty = (this.exhaustion ?? 0) * 3;

    const accuracy = this.skills?.accuracy.value ?? 0;
    const skill = this.skills?.[defenseData.skill]?.value ?? 0;
    const skillBonus = Math.floor(skill / 3);

    const attrMod = attributes[defenseData.attribute]?.mod ?? 0;

    const total =
      attrMod +
      accuracy +
      skillBonus +
      (defenseData.mod ?? 0) -
      exhaustionPenalty;

    return defenseData.override !== null ? defenseData.override : total;
  }

  #staminaRecovery() {
    const { stamina } = this.recovers;
    const { constitution } = this.attributes;

    const base = Math.floor(constitution.value / 2);
    const attributeMod = constitution.mod;
    const mod = stamina.mod || 0;

    return stamina.override !== null
      ? stamina.override
      : base + attributeMod + mod;
  }

  #manaRecovery() {
    const { mana } = this.recovers;
    const { wisdom } = this.attributes;

    const base = Math.floor(wisdom.value / 2);
    const attributeMod = wisdom.mod;
    const mod = mana.mod || 0;

    return mana.override !== null ? mana.override : base + attributeMod + mod;
  }

  #calcModifer(stat) {
    const lookupTable = [
      { minStat: 30, mod: 10 },
      { minStat: 29, mod: 9 },
      { minStat: 27, mod: 8 },
      { minStat: 25, mod: 7 },
      { minStat: 23, mod: 6 },
      { minStat: 21, mod: 5 },
      { minStat: 19, mod: 4 },
      { minStat: 17, mod: 3 },
      { minStat: 15, mod: 2 },
      { minStat: 13, mod: 1 },
      { minStat: 11, mod: 0 },
      { minStat: 8, mod: -1 },
      { minStat: 5, mod: -2 },
      { minStat: 1, mod: -3 },
      { minStat: 0, mod: -10 },
    ];
    const entry = lookupTable.find((i) => stat >= i.minStat);
    return entry ? entry.mod : -10;
  }
}
