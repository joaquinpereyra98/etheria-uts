export default class EtheriaItemData extends foundry.abstract.TypeDataModel {
  static defineSchema({ isEquippable = true } = {}) {
    const fields = foundry.data.fields;

    const schema = {};
    if (isEquippable)
      schema.isEquipped = new fields.BooleanField({ initial: false, label: "is Equipped?" });
    schema.description = new fields.SchemaField({
      value: new fields.HTMLField(),
      gmNotes: new fields.HTMLField(),
    })
    return schema;
  }
}
