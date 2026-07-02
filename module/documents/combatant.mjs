export default class EtheriaCombatant extends foundry.documents.Combatant {
  /**@inheritdoc*/
  _getInitiativeFormula() {
    return this.actor.system.initiative ?? super._getInitiativeFormula();
  }
}