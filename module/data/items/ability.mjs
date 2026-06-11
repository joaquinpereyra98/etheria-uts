import EtheriaItemData from "./_base-item.mjs";
import DamageField from "../shared/damage-field.mjs";
import { ASSETS_PATH, DOC_SUB_TYPES } from "../../constants.mjs";

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
      cost: new fields.SchemaField({
        value: new fields.NumberField({ integer: true }),
        resource: new fields.StringField(),
      }),
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
      range: new fields.StringField({ blank: true, label: "Range" }),
      area: new fields.StringField({ blank: true, label: "Area" }),
      damages: new fields.TypedObjectField(new DamageField()),
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

  /**
   * Indicates whether the ability is a spell.
   * @returns {boolean}
   */
  get isSpell() {
    return !!this.spheres.size;
  }
}
