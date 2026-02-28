import { TEMPLATE_PATH } from "../../../constants.mjs";
import MessagePart from "./base.mjs";

export default class RollPart extends MessagePart {
  static {
    Object.defineProperty(this, "TYPE", { value: "roll" });
  }

  /* -------------------------------------------------- */

  /** @override */
  static ACTIONS = {};

  /* -------------------------------------------------- */  

  /** @override */
  static TEMPLATE = `${TEMPLATE_PATH}/chat-messages/roll.hbs`;
}