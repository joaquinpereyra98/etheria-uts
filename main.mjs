import * as data from "./module/data/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as applications from "./module/applications/_module.mjs";
import * as hooks from "./module/hooks/_module.mjs";
import * as dice from "./module/dice/_module.mjs";

import { DOC_SUB_TYPES, MODULE_ID } from "./module/constants.mjs";
import { ETHERIA } from "./module/config.mjs";

Hooks.once("init", () => {
  CONFIG.ETHERIA = ETHERIA;

  CONFIG.ui[`${MODULE_ID}.ActionBar`] = applications.ux.ActionBar;

  CONFIG.Actor.documentClass = documents.EtheriaActor;
  CONFIG.ActiveEffect.documentClass = documents.EtheriaActiveEffect;
  CONFIG.Item.documentClass = documents.EtheriaItem;

  CONFIG.Actor.dataModels[DOC_SUB_TYPES.character] = data.EtheriaCharacterData;
  CONFIG.ActiveEffect.dataModels.base = data.effect.EtheriaBaseEffect;
  CONFIG.ActiveEffect.typeLabels.base =
    foundry.documents.ActiveEffect.metadata.label;

  CONFIG.ChatMessage.dataModels[DOC_SUB_TYPES.messages.roll] =
    data.messages.EtheriaRollMessage;
  CONFIG.ChatMessage.dataModels[DOC_SUB_TYPES.messages.item] =
    data.messages.EtheriaItemMessage;

  for (const model of Object.values(data.items)) {
    CONFIG.Item.dataModels[model.metadata.type] = model;
    CONFIG.Item.typeIcons[model.metadata.type] = model.metadata.icon;
  }

  CONFIG.Actor.defaultType = DOC_SUB_TYPES.character;

  CONFIG.Dice.rolls.unshift(dice.Etheriaroll);

  const { DocumentSheetConfig } = foundry.applications.apps;

  DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    MODULE_ID,
    applications.EtheriaCharacterSheet,
    {
      makeDefault: true,
      types: [DOC_SUB_TYPES.character],
    },
  );

  const itemSheets = [
    [DOC_SUB_TYPES.items.armor, applications.items.EtheriaArmorSheet],
    [DOC_SUB_TYPES.items.weapon, applications.items.EtheriaWeaponSheet],
    [DOC_SUB_TYPES.items.consumable, applications.items.EtheriaConsumableSheet],
    [DOC_SUB_TYPES.items.misc, applications.items.EtheriaMiscSheet],
    [DOC_SUB_TYPES.items.race, applications.items.EtheriaRaceSheet],
    [DOC_SUB_TYPES.items.ability, applications.items.EtheriaAbilitySheet],
  ];

  for (const [type, sheet] of itemSheets) {
    DocumentSheetConfig.registerSheet(
      foundry.documents.Item,
      MODULE_ID,
      sheet,
      {
        types: [type],
        makeDefault: true,
      },
    );
  }
});

Hooks.once("ready", () => {
  foundry.utils.setProperty(game, "system.grid.units", "Tiles");
  ui[`${MODULE_ID}.ActionBar`].render({ force: true });
});

Hooks.on("renderActiveEffectConfig", hooks.onRenderActiveEffectConfig);
