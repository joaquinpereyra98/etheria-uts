import { MODULE_ID } from "../constants.mjs";

/**
 * A hook event that fires for every User after conclusion of an update workflow.
 * @param {foundry.documents.Actor} actor - The existing Document which was updated
 * @param {object} changed - Differential data that was used to update the document
 * @param {Partial<foundry.abstract.types.DatabaseUpdateOperation>} options - Additional options which modified the update request
 * @param {string} userId -The ID of the User who triggered the update workflow
 */
export default function onUpdateActor(actor) {
  const ids = new Set(
    game.users
      .filter((u) => u.active && u.character?.id)
      .map((u) => u.character?.id),
  );

  if (ids.has(actor.id)) ui[`${MODULE_ID}.ActionsPanel`].render();
}
