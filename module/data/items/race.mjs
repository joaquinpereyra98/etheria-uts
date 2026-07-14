import { ASSETS_PATH, DOC_SUB_TYPES, MODULE_ID } from "../../constants.mjs";
import EtheriaItemData from "./_base-item.mjs";
import BoundAbilitiesMixin from "./mixins/bound-abilities-mixin.mjs";

export default class EtheriaRaceData extends BoundAbilitiesMixin(
  EtheriaItemData,
) {
  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      icon: "fa-solid fa-person-rays",
      img: `${ASSETS_PATH}/items-icons/viking-head.svg`,
      type: DOC_SUB_TYPES.items.race,
      isEquippable: false,
    }); 
  }

  /**@inheritdoc */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
    };
  }

  /**@inheritdoc */
  async _preCreate(data, options, user) {
    options[MODULE_ID] ??= {};
    const allowed = await super._preUpdate(data, options, user);
    if (allowed === false) return false;

    const parent = this.parent.parent;

    const parentIsActor =
      parent instanceof foundry.documents.Actor ||
      parent instanceof foundry.documents.ActorDelta;

    if (parentIsActor && parent?.system.race) {

      const question = game.i18n.localize("AreYouSure");
      const warning =
        "Changing your race will <strong>permanently overwrite</strong> your current racial data. All existing racial traits and progress will be lost. This action is <strong>irreversible</strong>.";
      const confirm = await foundry.applications.api.Dialog.confirm({
        window: { title: "GAME.ReturnSetup" },
        content: `<p><strong>${question}</strong> ${warning}</p>`,
      });

      if (!confirm) return false;

      Object.assign(options[MODULE_ID], {
        overrideRace: true,
      });

    }
  }

  /** @inheritdoc */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (game.user.id !== userId) return;

    const parent = this.parent.parent;
    const parentIsActor =
      parent instanceof foundry.documents.Actor ||
      parent instanceof foundry.documents.ActorDelta;
    if (!parentIsActor) return;

    const oldRaceUuid = parent.system.race;
    if (options[MODULE_ID]?.overrideRace && oldRaceUuid) {
      fromUuidSync(oldRaceUuid)?.delete();
    }

    parent.update({ "system.race": this.parent.id });
  }
}
