import { MODULE_ID } from "../constants.mjs";

/**
 * A hook event that fires for every User after conclusion of an update workflow.
 * @param {foundry.documents.Actor} actor - The existing Document which was updated
 * @param {object} changed - Differential data that was used to update the document
 * @param {Partial<foundry.abstract.types.DatabaseUpdateOperation>} options - Additional options which modified the update request
 * @param {string} userId -The ID of the User who triggered the update workflow
 */
export default function onUpdateUser(actor) {
  const actorsIds = new Set(game.users.map((u) => u.character.id));
  if (actorsIds.has(actor.id)) ui[`${MODULE_ID}.ActionsPanel`].render();
}
