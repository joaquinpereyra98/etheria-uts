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
        },
      });
    }

    /** @inheritdoc */
    static defineSchema() {
      const { SetField, DocumentUUIDField } = foundry.data.fields;
      return foundry.utils.mergeObject(super.defineSchema(), {
        targets: new SetField(new DocumentUUIDField({ type: "Token" })),
      });
    }

    /**
     * Prepares the target data for the Handlebars context.
     * @param {Object} context - The context object to mutate.
     */
    async _prepareContext(context) {
      await super._prepareContext(context);

      context.targets = this.targets
        .map((uuid) => ({
          uuid: uuid,
          doc: fromUuidSync(uuid),
        }))
        .filter((t) => !!t.doc);
    }

    /**
     * Synchronizes the internal targets list with the current user's targets.
     * @this {EtheriaTargetedMessage}
     * @type {foundry.applications.types.ApplicationClickAction}
     */
    static async #onRefreshTargets() {
      await this.parent.update({
        "system.targets": game.user.targets.map((t) => t.document.uuid),
      });
    }
  }

  return EtheriaTargetedMessage;
}
