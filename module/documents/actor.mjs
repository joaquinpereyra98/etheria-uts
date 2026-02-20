export default class EtheriaActor extends foundry.documents.Actor.implementation {
  /**@override */
  static get TYPES() {
    return super.TYPES.filter(k => !["token", "chess"].includes(k));
  }
}

