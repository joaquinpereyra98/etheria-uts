import EtheriaItemData from "./_base-item.mjs";
import DamageField from "../shared/damage-field.mjs";
import { ASSETS_PATH, DOC_SUB_TYPES } from "../../constants.mjs";
import FormulaField from "../fields/formula-field.mjs";
import simplifyRollFormula from "../../dice/simplify-roll-formula.mjs";

export default class EtheriaAbilityData extends EtheriaItemData {
  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      icon: "fa-solid fa-meteor",
      img: `${ASSETS_PATH}/items-icons/fire-ray.svg`,
      type: DOC_SUB_TYPES.items.ability,
      isEquippable: false,
      hasAccuracyRoll: true,
    });
  }

  /**@override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      actionType: new fields.StringField({
        choices: CONFIG.ETHERIA.abilityType,
        blank: false,
        required: true,
        nullable: false,
        initial: Object.keys(CONFIG.ETHERIA.abilityType)[0],
        label: "Action Type",
      }),
      uses: new fields.SchemaField(
        {
          value: new fields.NumberField({
            integer: true,
            min: 0,
            required: true,
          }),
          max: new fields.NumberField({
            integer: true,
            min: 0,
            required: true,
          }),
        },
        { label: "Uses" },
      ),
      costs: new fields.TypedObjectField(
        new fields.SchemaField({
          value: new FormulaField({ blank: true, deterministic: true }),
          resource: new fields.StringField(),
        }),
      ),
      spheres: new fields.SetField(
        new fields.StringField({
          required: true,
          blank: true,
          choices: CONFIG.ETHERIA.magicSpheres,
        }),
        { label: "Magic Spheras" },
      ),
      attribute: new fields.StringField({
        choices: CONFIG.ETHERIA.attributes,
        blank: true,
        label: "Attribute",
      }),
      range: new FormulaField({
        blank: true,
        label: "Range",
        deterministic: true,
      }),
      area: new fields.StringField({ blank: true, label: "Area" }),
      damages: new fields.TypedObjectField(
        new DamageField({ isAbility: true }),
      ),
      bound: new fields.DocumentUUIDField({ type: "Item" }),
    };
  }

  /** @inheritdoc */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user);
    if (allowed === false) return false;

    const newBound = changes.system?.bound;
    const oldBound = this._source.system?.bound;

    if (newBound !== undefined && oldBound) {
      const doc = await foundry.utils.fromUuid(oldBound);

      if (doc) {
        const updatedAbilities = doc.system._source.boundAbilities.filter(
          (uuid) => uuid !== this.parent.uuid,
        );

        await doc.update({ "system.boundAbilities": updatedAbilities });
      }
    }
  }

  get enricherCardData() {
    const range = this.range
      ? foundry.dice.Roll.defaultImplementation.replaceFormulaData(
          this.range,
          this.parent.getRollData(),
          { recursive: true, warn: true },
        )
      : "";

    const damagesConfig = {
      ...CONFIG.ETHERIA.damageTypes,
      ...CONFIG.ETHERIA.healingTypes,
    };
    const damages = Object.values(this.damages).map(({ formula, type }) => {
      const replaceFormula =
        foundry.dice.Roll.defaultImplementation.replaceFormulaData(
          formula,
          this.parent.getRollData(),
          { recursive: true, warn: true },
        );
      const simplifyFormula = simplifyRollFormula(replaceFormula, {
        deterministic: false,
      });
      return type === "equippedItem"
        ? "Equipped Item"
        : `${simplifyFormula} ${damagesConfig[type]?.label ?? type}`;
    });

    const resources = this.parent?.parent?.system?.getResourcesChoices() ?? {};

    const costs = Object.values(this.costs)
      .filter((c) => c.value && c.resource)
      .map(({ value, resource }) => {
        const resourceLabel = resources[resource] ?? resource;
        if (value) {
          value = foundry.dice.Roll.create(
            value,
            this.parent.getRollData(),
          ).evaluateSync().total;
        }
        return `${value} ${resourceLabel}`;
      });

    return {
      range,
      area: this.area,
      costs,
      damages,
    };
  }

  /**
   * Indicates whether the ability is a spell.
   * @returns {boolean}
   */
  get isSpell() {
    return !!this.spheres.size;
  }

  /** @inheritdoc */
  static migrateData(source, options, state) {
    if (!source) return super.migrateData(source, options, state);

    if (source.damages && typeof source.damages === "object") {
      const cleanDamages = {};
      for (const [key, value] of Object.entries(source.damages)) {
        const newKey = key.includes("-") ? key.replaceAll("-", "") : key;
        cleanDamages[newKey] = value;
      }
      source.damages = cleanDamages;
    } else {
      source.damages = {};
    }

    source.costs ??= {};
    if ("cost" in source) {
      source.costs.cost0 = source.cost;
      delete source.cost;
    }

    if (source.costs && typeof source.costs === "object") {
      const cleanCosts = {};
      for (const [key, value] of Object.entries(source.costs)) {
        const newKey = key.includes("-") ? key.replaceAll("-", "") : key;
        cleanCosts[newKey] = value;
      }
      source.costs = cleanCosts;
    } else {
      source.costs = {};
    }

    return super.migrateData(source, options, state);
  }
}
