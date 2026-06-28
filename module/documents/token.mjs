import TrackedTOF from "../data/fields/tracked-tof.mjs";

export default class EtheriaTokenDocument
  extends foundry.documents.TokenDocument
{
  /**
   * Retrieve an Array of attribute choices from a SchemaField.
   * @param {SchemaField} schema  The schema to explore for attributes.
   * @param {string[]} _path
   * @returns {TrackedAttributesDescription}
   * @protected
   */
  static _getTrackedAttributesFromSchema(schema, _path = []) {
    const attributes = { bar: [], value: [] };
    for (const [name, field] of Object.entries(schema.fields)) {
      const p = _path.concat([name]);
      if (field instanceof foundry.data.fields.NumberField)
        attributes.value.push(p);
      const isSchema = field instanceof foundry.data.fields.SchemaField;
      const isModel = field instanceof foundry.data.fields.EmbeddedDataField;
      const isTrackedTOF = field instanceof TrackedTOF;
      if (isSchema || isModel) {
        const schema = isModel ? field.model.schema : field;
        const isBar = schema.has("value") && schema.has("max");
        if (isBar) attributes.bar.push(p);
        else {
          const inner = this.getTrackedAttributes(schema, p);
          attributes.bar.push(...inner.bar);
          attributes.value.push(...inner.value);
        }
      } else if (isTrackedTOF) {
        for (const k of field.trackedKeys) {
          attributes.bar.push([p, k]);
        }
      }
    }
    return attributes;
  }
}
