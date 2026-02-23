import { ETHERIA } from "../../config.mjs";
import EtheriaItemData from "./_base-item.mjs";
import FormulaField from "../fields/formula-field.mjs";
import DamageField from "../shared/damage-field.mjs";

export default class EtheriaAbilityData extends EtheriaItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema({ isEquippable: false }),
      actionType: new fields.StringField({
        choices: ETHERIA.abilityType,
        blank: false,
        required: true,
        nullable: false,
        initial: Object.keys(ETHERIA.abilityType)[0],
        label: "Action Type",
      }),
      uses: new fields.SchemaField(
        {
          value: new fields.NumberField({ integer: true, min: 0 }),
          max: new fields.NumberField({ integer: true, min: 0 }),
        },
        { label: "Uses" },
      ),
      cost: new fields.SchemaField({
        value: new fields.NumberField({integer: true}),
        resource: new fields.StringField(),
      }),
      range: new fields.StringField({ blank: true, label: "Range" }),
      area: new fields.StringField({ blank: true, label: "Area" }),
      damages: new fields.TypedObjectField(new DamageField()),
      bound: new fields.DocumentUUIDField(),
    };
  }

  /** @inheritdoc */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user);
    if (allowed === false) return false;

    const newBound = changes.system?.bound;
    const oldBound = this._source.system?.bound;

    if (newBound !== undefined && oldBound) {
      const doc = await fromUuid(oldBound);

      if (doc) {
        const updatedAbilities = doc.system._source.boundAbilities.filter(
          (uuid) => uuid !== this.parent.uuid,
        );

        await doc.update({ "system.boundAbilities": updatedAbilities });
      }
    }
  }
}
