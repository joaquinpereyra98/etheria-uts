import EtheriaItemData from "./_base-item.mjs";

export default class EtheriaConsumableData extends EtheriaItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema({isEquippable: false}),
      charges: new fields.SchemaField({
        value: new fields.NumberField({ initial: 1, min: 0 }),
        max: new fields.NumberField({ initial: 1, min: 0 })
      }, {label: "Charges"})
    };
  }
}