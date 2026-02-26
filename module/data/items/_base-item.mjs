export default class EtheriaItemData extends foundry.abstract.TypeDataModel {
  /** @inheritDoc */
  static get metadata() {
    return {
      icon: "",
      img: foundry.documents.Item.DEFAULT_ICON,
      type: "base",
      isEquippable: true,
    };
  }

  get metadata () {
    return this.constructor.metadata;
  }

  /**@override */
  static defineSchema() {
    const fields = foundry.data.fields;

    const schema = {};
    if (EtheriaItemData.metadata.isEquippable)
      schema.equipped = new fields.BooleanField({
        initial: false,
        label: "is Equipped?",
      });
    schema.description = new fields.SchemaField({
      value: new fields.HTMLField(),
      gmNotes: new fields.HTMLField(),
    });
    return schema;
  }
}
