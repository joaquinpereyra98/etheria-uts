import {
  DOC_SUB_TYPES,
  EVALUATION_STATES,
  TEMPLATE_PATH,
} from "../../constants.mjs";
import EtheriaTargetedMessageMixin from "./mixin/targeted-messages.mjs";
import EtheriaRollMessage from "./rolls.mjs";

export default class EtherriaAccuracyMessage extends EtheriaTargetedMessageMixin(
  EtheriaRollMessage,
) {
  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      type: DOC_SUB_TYPES.messages.accuracy,
    });
  }

  /**@inheritdoc */
  static defineSchema() {
    const { fields } = foundry.data;
    return foundry.utils.mergeObject(super.defineSchema(), {
      evaluation: new fields.StringField({
        required: true,
        choices: Object.values(EVALUATION_STATES),
        initial: EVALUATION_STATES.IDLE,
      }),
    });
  }

  /** @override */
  async _prepareContext(context) {
    await super._prepareContext(context);
    context.evaluationIsIdle = this.evaluation === EVALUATION_STATES.IDLE;
    context.evaluationIsPending = this.evaluation === EVALUATION_STATES.PENDING;
  }

  /** @inheritdoc */
  async _renderHTML(element, context) {
    const template = `${TEMPLATE_PATH}/chat-messages/accuracy.hbs`;
    const html = await foundry.applications.handlebars.renderTemplate(
      template,
      context,
    );
    element.insertAdjacentHTML("beforeend", html);
  }
}
