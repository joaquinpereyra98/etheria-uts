import { DOC_SUB_TYPES, TEMPLATE_PATH } from "../../constants.mjs";
import EtheriaBaseMessage from "./base.mjs";
import EtheriaTargetedMessageMixin from "./mixin/targeted-messages.mjs";

/**
 * A chat message subtype for applying Active Effects to targeted tokens.
 */
export default class EtheriaEffectMessage extends EtheriaTargetedMessageMixin(
  EtheriaBaseMessage,
) {
  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      type: DOC_SUB_TYPES.messages.effect,
      actions: {
        applySelf: EtheriaEffectMessage.#onApplySelf,
        applyTarget: EtheriaEffectMessage.#onApplyTarget,
      },
    });
  }

  /**@inheritdoc */
  static defineSchema() {
    const { fields } = foundry.data;
    return foundry.utils.mergeObject(super.defineSchema(), {
      effects: new fields.SchemaField({
        self: new fields.SetField(
          new fields.DocumentUUIDField({ type: "ActiveEffect" }),
        ),
        target: new fields.SetField(
          new fields.DocumentUUIDField({ type: "ActiveEffect" }),
        ),
      }),
    });
  }

  /** @override */
  async _prepareContext(context) {
    await super._prepareContext(context);

    const resolveEffects = async (uuids) => {
      const effects = [];
      for (const uuid of uuids) {
        const effect = await foundry.utils.fromUuid(uuid);
        if (effect) effects.push(effect);
      }
      return effects;
    };

    context.effects = {
      self: await resolveEffects(this.effects.self),
      target: await resolveEffects(this.effects.target),
    };
  }

  /** @inheritdoc */
  async _renderHTML(element, context) {
    const template = `${TEMPLATE_PATH}/chat-messages/effect.hbs`;
    const html = await foundry.applications.handlebars.renderTemplate(
      template,
      context,
    );
    element.insertAdjacentHTML("beforeend", html);
  }

  /**
   * Applies self effects to the speaker or selected token.
   * @this {EtheriaEffectMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onApplySelf(_event, target) {
    const actor = this.parent.speakerActor;

    if (!actor) {
      ui.notifications.warn("Etheria | No actor found to apply self effects.");
      return;
    }

    await this.#applyEffectsToActor(actor, "self");
  }

  /**
   * Applies target effects to a specific targeted token.
   * @this {EtheriaEffectMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onApplyTarget(_event, target) {
    const { uuid } = target.closest("[data-uuid]")?.dataset ?? {};
    if (!uuid) return;

    const token = await foundry.utils.fromUuid(uuid);
    const actor = token?.actor;

    if (!actor) {
      ui.notifications.warn("Etheria | Target actor not found.");
      return;
    }

    await this.#applyEffectsToActor(actor, "target");
  }

  /**
   *
   * @param {foundry.documents.Actor} actor
   * @param {"self"|"target"} type
   */
  async #applyEffectsToActor(actor, type) {
    const uuids = this.effects[type];
    if (!uuids.size) return;

    /**@type {foundry.documents.types.ActiveEffectData[]} */
    const effectsData = [];
    for (const uuid of uuids) {
      const effect = await foundry.utils.fromUuid(uuid);
      if (effect) effectsData.push(effect.toObject());
    }

    if (effectsData.length) {
      await actor.createEmbeddedDocuments("ActiveEffect", effectsData);
      ui.notifications.info(
        `Etheria | Applied ${effectsData.length} ${type} effects to ${actor.name}.`,
      );
    }
  }
}
