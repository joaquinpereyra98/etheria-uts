/**
 * Schema definition for the actions field.
 * @typedef {Object} CardAction A collection of action configurations.
 * @property {string} actions.action - The unique identifier for the action.
 * @property {string} [actions.label=""] - The display text for the action button.
 * @property {string} [actions.icon=""] - The FontAwesome class for the icon.
 * @property {Record<string, string>} [actions.dataset] - Additional data attributes to be injected into the DOM.
 */

export default class EtheriaItemData extends foundry.abstract.TypeDataModel {
  /** Default metadata which applies to each instance of this Document sub-type */
  static get metadata() {
    return {
      icon: "",
      img: foundry.documents.Item.DEFAULT_ICON,
      type: "base",
      isEquippable: true,
      hasAccuracyRoll: false,
    };
  }

  /** Default metadata which applies to each instance of this Document sub-type */
  get metadata() {
    return this.constructor.metadata;
  }

  /**@override */
  static defineSchema() {
    const fields = foundry.data.fields;

    const schema = {};
    if (this.metadata.isEquippable) {
      schema.equipped = new fields.BooleanField({
        initial: false,
        label: "is Equipped?",
      });
    }
    schema.description = new fields.SchemaField({
      value: new fields.HTMLField(),
      gmNotes: new fields.HTMLField(),
    });
    return schema;
  }

  /**
   * Returns the record of action objects for the Item Card Messages.
   * @returns {Record<String, CardAction>}
   */
  getCardActions() {
    const actions = {};

    const haveUses =
      this.uses && this.uses.value !== null && this.uses.max !== null;

    const haveCost = Object.values(this.costs)?.filter((c) => c.value && c.resource).length;
    if (haveUses || haveCost) {
      actions.consumeItem = {
        action: "consumeItem",
        label: "Consume",
        icon: "fa-solid fa-flask-round-potion",
      };
    }

    if (this.constructor.metadata.hasAccuracyRoll) {
      actions.rollAccuracy = {
        action: "rollAccuracy",
        label: "Check Accuracy",
        icon: "fa-solid fa-crosshairs",
      };
    }

    const actionsEffects = this.parent.getActionsEffect() ?? [];
    if (actionsEffects.length > 0) {
      actions.applyEffects = {
        action: "applyEffects",
        label: "Apply Effects",
        icon: "fa-solid fa-sparkles",
      };
    }

    return actions;
  }
}
