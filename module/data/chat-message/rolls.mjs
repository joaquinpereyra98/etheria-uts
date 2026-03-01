import { TEMPLATE_PATH } from "../../constants.mjs";
import EtheriaBaseMessage from "./base.mjs";

export default class EtheriaRollMessage extends EtheriaBaseMessage {
  /**
   * Serialized content of any Roll instances attached to the ChatMessage
   * @type {foundry.dice.Roll[]}
   */
  get rolls() {
    return this.document.rolls;
  }

  /** @override */
  async _prepareContext(context) {
    context.renderedRolls = await Promise.all(
      this.rolls.map(async (roll) => {
        const instance = roll instanceof foundry.dice.Roll ? roll : foundry.dice.Roll.fromData(roll);
        return instance.render({ isPrivate: !this.document.isContentVisible });
      }),
    );
  }

  /** @inheritdoc */
  async _renderHTML(element, context) {
    const template = `${TEMPLATE_PATH}/chat-messages/roll.hbs`;
    const html = await foundry.applications.handlebars.renderTemplate(
      template,
      context,
    );
    element.insertAdjacentHTML("beforeend", html);
  }
}
