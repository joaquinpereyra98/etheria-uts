import * as data from "./module/data/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as applications from "./module/applications/_module.mjs";

import { DOC_SUB_TYPES, MODULE_ID } from "./module/constants.mjs";
import { ETHERIA } from "./module/config.mjs";

Hooks.once("init", () => {
  CONFIG.ETHERIA = ETHERIA;

  CONFIG.Actor.documentClass = documents.EtheriaActor;
  CONFIG.Actor.dataModels[DOC_SUB_TYPES.character] = data.EtheriaCharacterData;

  Object.assign(CONFIG.Item.dataModels, {
    [DOC_SUB_TYPES.items.ability]: data.items.EtheriaAbilityData,
    [DOC_SUB_TYPES.items.armor]: data.items.EtheriaArmorData,
    [DOC_SUB_TYPES.items.consumable]: data.items.EtheriaConsumableData,
    [DOC_SUB_TYPES.items.misc]: data.items.EtheriaMiscData,
    [DOC_SUB_TYPES.items.weapon]: data.items.EtheriaWeaponData,
  });

  CONFIG.Actor.defaultType = DOC_SUB_TYPES.character;

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

  DocumentSheetConfig.registerSheet(
    foundry.documents.Item,
    MODULE_ID,
    applications.items.EtheriaArmorSheet,
    {
      makeDefault: true,
      types: [DOC_SUB_TYPES.items.armor],
    },
  );

  DocumentSheetConfig.registerSheet(
    foundry.documents.Item,
    MODULE_ID,
    applications.items.EtheriaWeaponSheet,
    {
      makeDefault: true,
      types: [DOC_SUB_TYPES.items.weapon],
    },
  );

  DocumentSheetConfig.registerSheet(
    foundry.documents.Item,
    MODULE_ID,
    applications.items.EtheriaConsumableSheet,
    {
      makeDefault: true,
      types: [DOC_SUB_TYPES.items.consumable],
    },
  );

  DocumentSheetConfig.registerSheet(
    foundry.documents.Item,
    MODULE_ID,
    applications.items.EtheriaMiscSheet,
    {
      makeDefault: true,
      types: [DOC_SUB_TYPES.items.misc],
    },
  );

  DocumentSheetConfig.registerSheet(
    foundry.documents.Item,
    MODULE_ID,
    applications.items.EtheriaAbilitySheet,
    {
      makeDefault: true,
      types: [DOC_SUB_TYPES.items.ability],
    },
  );
  

});
