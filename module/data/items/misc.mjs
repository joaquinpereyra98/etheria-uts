import EtheriaItemData from "./_base-item.mjs";

export default class EtheriaMiscData extends EtheriaItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      //boundAbilities: new fields.ArrayField(new fields.StringField()) // IDs of abilities granted
    };
  }
}
