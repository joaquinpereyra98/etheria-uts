const { TypeDataModel } = foundry.abstract;
import {
  createResistancesFields,
  createSphereFields,
  createAttributesFields,
  createSkillsFields,
} from "./utils.mjs";

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
        magicDamage: new fields.NumberField({ integer: true, initial: 0 }),
      }),

      resistances: new fields.SchemaField(createResistancesFields({ min: 0 })),

      magicSpheres: new fields.SchemaField(createSphereFields({ min: 0 })),

      details: new fields.SchemaField({
        isCaster: new fields.BooleanField({ initial: false }),
        description: new fields.HTMLField(),
        gmNotes: new fields.HTMLField(),
      }),

      currencies: new fields.SchemaField({
        argents: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
      }),
    };
  }

  /**@override */
  prepareBaseData() {
    this.recovers = {
      stamina: { mod: 0, override: null },
      mana: { mod: 0, override: null },
    };

    this.defense = {
      block: { mod: 0, override: null },
      parry: { mod: 0, override: null },
      dodge: { mod: 0, override: null },
    };
  }

  /**@override */
  prepareDerivedData() {
    for (const [key, attribute] of Object.entries(this.attributes)) {
      this.attributes[key].mod = this.#calcModifer(attribute.value);
    }

    for (const [key, skill] of Object.entries(this.skills)) {
      const attrKey = ETHERIA.skills[key].attribute;
      skill.total = skill.value + (this.attributes[attrKey]?.mod ?? 0);
    }

    const { constitution, wisdom } = this.attributes;

    for (const [key, recover] of Object.entries(this.recovers)) {
      const attribute = key === "stamina" ? constitution : wisdom;
      foundry.utils.setProperty(
        this.recovers,
        `${key}.value`,
        recover.override ??
          Math.floor(attribute.value / 2) + attribute.mod + recover.mod,
      );
    }

    for (const [key, defense] of Object.entries(this.defense)) {
      foundry.utils.setProperty(
        this.defense,
        `${key}.value`,
        defense.override ?? this.#calculateDefense(key) + defense.mod,
      );
    }
  }

  /**
   * Calculates combat defense stats.
   * @param {"block"|"parry"|"dodge"} key - The defense key to calculate.
   * @returns {number} The final calculated defense value.
   */
  #calculateDefense(key) {
    const { skill, attribute } = ETHERIA.defenses[key];

    const exhaustionPenalty = (this.exhaustion ?? 0) * 3;

    const accuracy = this.skills.accuracy?.value ?? 0;
    const skillValue = this.skills[skill]?.value ?? 0;
    const attrMod = this.attributes[attribute]?.mod ?? 0;

    return attrMod + accuracy + Math.floor(skillValue / 3) - exhaustionPenalty;
  }

  #calcModifer(stat) {
    const lookupTable = [
      { min: 30, mod: 10 },
      { min: 29, mod: 9 },
      { min: 27, mod: 8 },
      { min: 25, mod: 7 },
      { min: 23, mod: 6 },
      { min: 21, mod: 5 },
      { min: 19, mod: 4 },
      { min: 17, mod: 3 },
      { min: 15, mod: 2 },
      { min: 13, mod: 1 },
      { min: 11, mod: 0 },
      { min: 8, mod: -1 },
      { min: 5, mod: -2 },
      { min: 1, mod: -3 },
      { min: 0, mod: -10 },
    ];
    const entry = lookupTable.find((i) => stat >= i.min);
    return entry ? entry.mod : -10;
  }

  /**
   * Generates an object mapping resource paths to their display labels.
   * @returns {Object<string, string>}
   */
  getResourcesChoices() {
    const { schema, resourcesExtra } = this;

    const entries = [
      ...Object.entries(schema.fields.resources.fields).map(([k, v]) => [
        `system.resources.${k}`,
        v.label,
      ]),
      ...Object.entries(resourcesExtra).map(([k, v]) => [
        `system.resourcesExtra.${k}`,
        v.label,
      ]),
    ];

    return Object.fromEntries(entries);
  }

  get race() {
    return foundry.utils.fromUuidSync(this.race);
  }
}
