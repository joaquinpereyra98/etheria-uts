import EtheriaRollDialog from "../../../applications/dialog/roll-dialog.mjs";
import { ACCURACY_STATES } from "../../../constants.mjs";
import EtheriaBaseMessage from "../base.mjs";

/**
 * A mixin to add target tracking and management to Etheria Message classes.
 * @param {typeof EtheriaBaseMessage} Base - The base class to extend.
 * @returns {EtheriaTargetedMessage} - The extended class.
 */
export default function EtheriaTargetedMessageMixin(Base) {
  class EtheriaTargetedMessage extends Base {
    /** @inheritDoc */
    static get metadata() {
      return foundry.utils.mergeObject(super.metadata, {
        actions: {
          refreshTargets: EtheriaTargetedMessage.#onRefreshTargets,
          promptGMForRoll: EtheriaTargetedMessage.#onPromptGMForRoll,
        },
      });
    }

    /** @inheritdoc */
    static defineSchema() {
      const { fields } = foundry.data;
      return foundry.utils.mergeObject(super.defineSchema(), {
        targets: new fields.SetField(
          new fields.SchemaField({
            uuid: new fields.DocumentUUIDField({ type: "Token" }),
            result: new fields.StringField({
              required: true,
              choices: Object.values(ACCURACY_STATES),
              initial: ACCURACY_STATES.PENDING,
              label: "Attack Result",
            }),
          }),
        ),
      });
    }

    /**
     * Prepares the target data for the Handlebars context.
     * @param {Object} context - The context object to mutate.
     */
    async _prepareContext(context) {
      await super._prepareContext(context);

      context.targets = this.targets
        .map((data) => ({
          uuid: data.uuid,
          result: data.result,
          icon: this._getTargetIcon(data.result),
          doc: fromUuidSync(data.uuid),
        }))
        .filter((t) => !!t.doc);
    }

    /**
     * Helper to determine the icon for a target result.
     * @param {string} result
     * @returns {string}
     */
    _getTargetIcon(result) {
      switch (result) {
        case ACCURACY_STATES.HIT:
          return "fa-check hit";
        case ACCURACY_STATES.MISS:
          return "fa-xmark miss";
        default:
          return "fa-clock";
      }
    }

    /**
     * Synchronizes the internal targets list with the current user's targets.
     * @this {EtheriaTargetedMessage}
     * @type {foundry.applications.types.ApplicationClickAction}
     */
    static async #onRefreshTargets() {
      const currentUuids = this.targets.filter(
        (t) => t.result !== ACCURACY_STATES.PENDING,
      );

      const newTargets = game.user.targets
        .filter((t) => !currentUuids.has(t.document.uuid))
        .map((t) => ({
          uuid: t.document.uuid,
          result: ACCURACY_STATES.PENDING,
        }));

      await this.parent.update({
        "system.targets": [...currentUuids, ...newTargets],
      });
    }

    /**
     *
     * @this {EtheriaTargetedMessage}
     * @type {foundry.applications.types.ApplicationClickAction}
     */
    static async #onPromptGMForRoll() {
      new EtheriaRollDialog({roll: new foundry.dice.Roll("1d20+5+2")}).render(true);
    
    }
  }

  return EtheriaTargetedMessage;
}
