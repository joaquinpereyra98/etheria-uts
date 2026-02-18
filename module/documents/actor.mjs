export default class EtheriaActor extends foundry.documents.Actor {
  /**@override */
  static get TYPES() {
    return super.TYPES.filter(k => !["token", "chess"].includes(k));
  }
}

