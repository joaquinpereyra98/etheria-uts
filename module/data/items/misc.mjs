import { DOC_SUB_TYPES, MODULE_ID } from "../../constants.mjs";
import EtheriaItemData from "./_base-item.mjs";

export default class EtheriaMiscData extends EtheriaItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      boundAbilities: new fields.SetField(new fields.DocumentUUIDField()),
    };
  }

  /** @inheritdoc */
  async _preUpdate(changes, options, user) {
    options[MODULE_ID] ??= {};
    const allowed = await super._preUpdate(changes, options, user);
    if (allowed === false) return false;

    const boundChanges = changes?.system?.boundAbilities;
    if (boundChanges) {
      const changeSet = new Set([boundChanges].flat());
      const oldSet = new Set(this._source.boundAbilities ?? []);

      const added = changeSet.difference(oldSet);
      const removed = oldSet.difference(changeSet);

      if (added.size > 0 || removed.size > 0) {
        const allAffectedUuids = [...added, ...removed];
        const docs = (
          await Promise.all(allAffectedUuids.map(foundry.utils.fromUuid))
        ).filter(Boolean);

        const canModify = docs.every((d) => d.canUserModify(user, "update"));
        const validLocation = docs.every(
          (d) => d.collection === this.parent.collection && d.type === DOC_SUB_TYPES.items.ability
        );

        if (!canModify) {
          ui.notifications.warn(
            "You don't have permission to modify these abilities.",
          );
          return false;
        }

        if (!validLocation) {
          ui.notifications.error(
            "Bound abilities must be Items from the same Compendium or Collection.",
          );
          return false;
        }

        Object.assign(options[MODULE_ID], {
          added: Array.from(added),
          removed: Array.from(removed),
        });
      }
    }
  }

  /** @inheritdoc */
  _onUpdate(changed, options, user) {
    super._onUpdate(changed, options, user);

    if (game.user.id !== user) return;

    const metadata = options[MODULE_ID];
    if (!metadata) return;

    const { added, removed } = metadata;
    const parentUuid = this.parent?.uuid ?? "";

    if (added?.length) {
      for (const uuid of added) {
        const doc = foundry.utils.fromUuidSync(uuid);
        doc?.update({ "system.bound": parentUuid });
      }
    }

    if (removed?.length) {
      for (const uuid of removed) {
        const doc = foundry.utils.fromUuidSync(uuid);
        if (doc?.system?.bound === parentUuid) {
          doc.update({ "system.bound": "" });
        }
      }
    }
  }
}
