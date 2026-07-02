const { TypeDataModel } = foundry.abstract;
import {
  createResistancesFields,
  createSphereFields,
  createAttributesFields,
  createSkillsFields,
  createActionsFields,
} from "./utils.mjs";

import {
  LocalDocumentField,
  FormulaField,
  TrackedTOF,
} from "./fields/_module.mjs";
import { ResourceSchemaField } from "./shared/_module.mjs";
import { DOC_SUB_TYPES } from "../constants.mjs";
import simplifyRollFormula from "../dice/simplify-roll-formula.mjs";

export default class EtheriaCharacterData extends TypeDataModel {
  static defineSchema() {
    const { fields } = foundry.data;

    return {
      level: new fields.NumberField({ initial: 1, min: 1, label: "Level" }),
      exhaustion: new fields.NumberField({ initial: 0, min: 0 }),
      race: new LocalDocumentField(foundry.documents.Item, { fallback: false }),
      initiative: new FormulaField({
        initial: "@agi.mod + (@spe.value / 2)",
        label: "Initiative",
      }),
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
        mana: new ResourceSchemaField({
          schemaOptions: { label: "Mana" },
          valueOptions: { min: 0 },
          maxOptions: { min: 0 },
        }),
      }),

      resourcesExtra: new TrackedTOF(
        new ResourceSchemaField({
          maxOptions: { min: 0, nullable: true, initial: null },
          schemaOptions: { customLabel: true },
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

      resistances: new fields.SchemaField(createResistancesFields()),

      magicSpheres: new fields.SchemaField(createSphereFields({ min: 0 })),

      details: new fields.SchemaField({
        isCaster: new fields.BooleanField({ initial: false }),
        description: new fields.HTMLField(),
        gmNotes: new fields.HTMLField(),
      }),

      currencies: new fields.SchemaField({
        argents: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
      }),

      actions: new fields.SchemaField(createActionsFields()),
    };
  }

  static phaseRules = [
    {
      phase: "afterAttributes",
      regexes: [
        /^system\.attributes\..+\.mod$/,
        /^system\.skills\..+\.(total|value)$/,
      ],
    },
    {
      phase: "final",
      regexes: [
        /^system\.defense\./,
        /^system\.recovers\./,
        /^system\.initiative\./,
      ],
    },
  ];

  /**@override */
  prepareDerivedData() {
    for (const attribute of Object.values(this.attributes)) {
      attribute.mod = this.#calcModifier(attribute.value);
    }

    this.parent.applyActiveEffects("afterAttributes");

    this.#calcArmor();

    for (const [key, skill] of Object.entries(this.skills)) {
      const attrKey = CONFIG.ETHERIA.skills[key].attribute;
      skill.total = skill.value + (this.attributes[attrKey]?.mod ?? 0);
    }

    const { constitution: con, wisdom: wiz } = this.attributes;

    this.recovers = {
      stamina: { value: Math.floor(con.value / 2) + con.mod + 5 },
      mana: { value: Math.floor(wiz.value / 2) + wiz.mod + 5 },
    };

    this.defense = {
      block: { value: this.#calculateDefense("block") },
      parry: { value: this.#calculateDefense("parry") },
      dodge: { value: this.#calculateDefense("dodge") },
    };

    this.initiative = simplifyRollFormula(foundry.dice.Roll.defaultImplementation.replaceFormulaData(
              this.initiative,
              this.parent.getRollData(),
              { recursive: true, warn: true },
            )
          ?? "");
  }

  get changesKeys() {
    return Object.keys(foundry.utils.flattenObject({ system: { ...this } }));
  }

  /**
   * Calculates combat defense stats.
   * @param {"block"|"parry"|"dodge"} key - The defense key to calculate.
   * @returns {number} The final calculated defense value.
   */
  #calculateDefense(key) {
    const { skill, attribute } = CONFIG.ETHERIA.defenses[key];

    const exhaustionPenalty = (this.exhaustion ?? 0) * 3;

    const accuracy = this.skills.accuracy?.value ?? 0;
    const skillValue = this.skills[skill]?.value ?? 0;
    const attrMod = this.attributes[attribute]?.mod ?? 0;

    const mod =
      key === "block"
        ? this.parent.itemTypes[DOC_SUB_TYPES.items.shield].reduce(
            (acc, i) => acc + i.system.block,
            0,
          )
        : 0;

    return (
      attrMod + accuracy + Math.floor(skillValue / 3) - exhaustionPenalty + mod
    );
  }

  /**
   * Calculates a numerical modifier based on a provided atribute
   * @private
   * @param {number} stat - The base stat.
   * @returns {number} The corresponding modifier value.
   */
  #calcModifier(stat) {
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

  #calcArmor() {
    const armors = this.parent.itemTypes[DOC_SUB_TYPES.items.armor] ?? [];
    const armorMod = armors.reduce((acc, armor) => {
      if (armor.system.equipped) acc += armor.system.armorValue ?? 0;
      return acc;
    }, 0);

    this.resources.armor.value += armorMod;
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

  /**
   * Prepares data to be accessible within roll formulas.
   * @returns {object} The prepared roll data.
   */
  getRollData() {
    const data = { ...this };

    data.exhaustion = (data.exhaustion ?? 0) * 3;
    data.exh = data.exhaustion;

    for (const [k, v] of Object.entries(CONFIG.ETHERIA.attributes)) {
      if (v.abbr) data[v.abbr] = data.attributes[k];
    }

    for (const [k, v] of Object.entries({
      ...data.resources,
      ...data.resourcesExtra,
    })) {
      data[k] = { value: v.value };
      if (v.max !== null) data[k].max = v.max;
    }

    data.acc = data.bonus.accuracy ?? 0;
    data.physical = data.bonus.physicalDamage ?? 0;
    data.magic = data.bonus.magicDamage ?? 0;

    return data;
  }
}
