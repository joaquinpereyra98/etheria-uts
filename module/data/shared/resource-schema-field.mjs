/**
 * @typedef ResourceSchemaFieldData
 * @property {Partial<foundry.data.types.DataFieldOptions>} schemaOptions
 * @property {Partial<foundry.data.types.NumberFieldOptions>} valueOptions
 * @property {Partial<foundry.data.types.NumberFieldOptions>} maxOptions
 */

/**
 * Field for storing range data.
 */
export default class ResourceSchemaField
  extends foundry.data.fields.SchemaField
{
  /**
   * @param {ResourceSchemaFieldData} [options] - Options which configure the behavior of the field
   * @param {foundry.data.types.DataFieldContext} [context] - Additional context which describes the field
   */
  constructor(
    { schemaOptions = {}, valueOptions = {}, maxOptions = {} } = {},
    context = {},
  ) {
    const { customLabel = false } = schemaOptions;

    /**@type {Partial<foundry.data.types.NumberFieldOptions>} */
    const baseConfig = {
      integer: true,
      nullable: false,
      required: true,
      initial: 0,
    };

    const margeDefaultOptions = (options) =>
      foundry.utils.mergeObject(baseConfig, options, { inplace: false });

    const fields = {
      value: new foundry.data.fields.NumberField(
        margeDefaultOptions(valueOptions),
      ),
      max: new foundry.data.fields.NumberField(margeDefaultOptions(maxOptions)),
    };

    if (customLabel) {
      fields.label = new foundry.data.fields.StringField({
        required: true,
        nullable: false,
        initial: "New Resource Extra",
        blank: false,
      });
    }

    super(fields, schemaOptions, context);
  }
}
