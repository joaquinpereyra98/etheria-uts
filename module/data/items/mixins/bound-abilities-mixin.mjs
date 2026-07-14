import EtheriaItem from "../../../documents/item.mjs";
import { MODULE_ID, DOC_SUB_TYPES } from "../../../constants.mjs";

/**
 * @typedef { foundry.documents.collections.CompendiumCollection<foundry.documents.Item> |
 * foundry.abstract.EmbeddedCollection<foundry.documents.Item> |
 * foundry.documents.collections.Items } ItemCollection
 */

/**
 * A Mixin that adds the ability for a Document to maintain a set of "Bound Abilities."
 */
export default function BoundAbilitiesMixin(Base) {
  return class BoundAbilitiesMixinClass extends Base {
    /** @inheritdoc */
    static defineSchema() {
      const fields = foundry.data.fields;
      return {
        ...super.defineSchema(),
        boundAbilities: new fields.SetField(
          new fields.DocumentUUIDField({ type: "Item" }),
        ),
      };
    }

    /** @inheritdoc */
    async _onCreate(data, options, userId) {
      super._onCreate(data, options, userId);
      if (game.user.id !== userId) return;

      /**@type {foundry.documents.Item} */
      const item = this.parent;
      /**@type {ItemCollection} */
      const collection = item.collection;

      const isCompendium =
        collection instanceof
        foundry.documents.collections.CompendiumCollection;

      const isEmbedded =
        collection instanceof foundry.abstract.EmbeddedCollection;

      const currentUuids = this._source.boundAbilities;
      if (!currentUuids.length) return;

      const newUuids = [];
      const itemsToCreate = [];

      for (const uuid of currentUuids) {
        const originalItem = await foundry.utils.fromUuid(uuid);
        if (!originalItem) continue;

        const localItem = isCompendium
          ? await collection.getDocument(originalItem.id)
          : collection.get(originalItem.id);

        if (localItem) {
          await localItem.update({ "system.bound": item.uuid });
          newUuids.push(localItem.uuid);
        } else {
          const itemData = originalItem.toObject();
          itemData.system.bound = item.uuid;
          itemsToCreate.push(itemData);
        }
      }

      if (itemsToCreate.length) {
        const operation = isCompendium
          ? { pack: collection.metadata.id }
          : isEmbedded
            ? { parent: collection.model, pack: collection.model.pack }
            : {};
        const createdItems = await collection.documentClass.createDocuments(
          itemsToCreate,
          operation,
        );
        newUuids.push(...createdItems.map((i) => i.uuid));
      }

      if (newUuids.length) {
        await item.update({ "system.boundAbilities": newUuids });
      }
    }

    /** @inheritdoc */
    async _preUpdate(changes, options, user) {
      const allowed = await super._preUpdate(changes, options, user);
      if (allowed === false) return false;

      const boundChanges = changes?.system?.boundAbilities;
      if (!boundChanges) return;

      options[MODULE_ID] ??= {};

      const changeSet = new Set([boundChanges].flat());
      const oldSet = new Set(this._source.boundAbilities ?? []);

      const added = changeSet.difference(oldSet);
      const removed = oldSet.difference(changeSet);

      if (added.size > 0 || removed.size > 0) {
        const addedDocs = await Promise.all(
          [...added].map((uuid) => foundry.utils.fromUuid(uuid)),
        );
        const removedDoc = await Promise.all(
          [...removed].map((uuid) => foundry.utils.fromUuid(uuid)),
        );
        const docs = [...addedDocs, ...removedDoc];

        // validations
        const isAbility = addedDocs.every(
          (d) => d.type === DOC_SUB_TYPES.items.ability,
        );
        const canModify = docs.every((d) => d.canUserModify(user, "update"));
        const validLoc = addedDocs.every(
          (d) => d.collection === this.parent.collection,
        );

        if (!isAbility) {
          ui.notifications.warn("Bounded Items must be abilities.");
          return false;
        }

        if (!canModify) {
          ui.notifications.warn("No permission to modify these abilities.");
          return false;
        }

        if (!validLoc) {
          ui.notifications.error(
            "Bound abilities must be in the same collection.",
          );
          return false;
        }

        Object.assign(options[MODULE_ID], {
          addedAbilities: Array.from(added),
          removedAbilities: Array.from(removed),
        });
      }
      return true;
    }

    /** @inheritdoc */
    _onUpdate(changed, options, user) {
      super._onUpdate(changed, options, user);
      if (game.user.id !== user) return;

      const { addedAbilities, removedAbilities } = options[MODULE_ID] ?? {};
      const parentUuid = this.parent?.uuid ?? "";

      if (addedAbilities?.length) {
        for (const uuid of addedAbilities) {
          fromUuidSync(uuid)?.update({ "system.bound": parentUuid });
        }
      }

      if (removedAbilities?.length) {
        for (const uuid of removedAbilities) {
          const doc = fromUuidSync(uuid);
          if (doc?.system?.bound === parentUuid)
            doc.update({ "system.bound": "" });
        }
      }
    }

    /** @inheritdoc */
    async _onDelete(options, userId) {
      super._onDelete(options, userId);
      if (game.user.id !== userId) return;
      /**@type {foundry.documents.Item} */
      const item = this.parent;
      /**@type {ItemCollection} */
      const collection = item.collection;

      const isEmbedded =
        collection instanceof foundry.abstract.EmbeddedCollection;

      const boundAbilities = this._source.boundAbilities;

      if (isEmbedded) {
        const itemsToDelete = collection
          .filter((i) => boundAbilities.includes(i.uuid))
          .map((item) => item.id);

        if (itemsToDelete.length) {
          collection.documentClass.deleteDocuments(itemsToDelete, {
            parent: collection.model,
            pack: collection.model.pack,
          });

          ui.notifications.warn(
            `Deleted ${itemsToDelete.length} bound abilities because their parent was deleted.`,
          );
        }
      } else {
        const itemsToUpdate = await Promise.all(
          boundAbilities.map((u) => foundry.utils.fromUuid(u)),
        );
        if (itemsToUpdate) {
          itemsToUpdate.forEach((i) => i.update({ "system.bound": "" }));
        }
      }
    }

    /**
     * A convenience getter that resolves the UUIDs in boundAbilities into actual Item documents.
     * @type {EtheriaItem[]}
     */
    get boundAbilitiesDocs() {
      return Array.from(this.boundAbilities)
        .map((uuid) => fromUuidSync(uuid))
        .filter(Boolean);
    }

    /**@inheritdoc */
    getCardActions() {
      const actions = super.getCardActions();

       if (this.boundAbilities.size > 0) {
         for (const doc of this.boundAbilitiesDocs) {
           actions[doc.id] = {
             action: "useDoc",
             label: `Use ${doc.name} ability`,
             icon: doc.img,
             dataset: {
               docUuid: doc.uuid,
             },
           };
         }
       }

       return actions;
    }
  };
}
