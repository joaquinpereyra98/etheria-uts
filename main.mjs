import * as data from "./module/data/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as applications from "./module/applications/_module.mjs";

import { DOC_SUB_TYPES, MODULE_ID } from "./module/constants.mjs";
import { ETHERIA } from "./module/config.mjs";

Hooks.once("init", () => {
  CONFIG.ETHERIA = ETHERIA;

  CONFIG.Actor.documentClass = documents.EtheriaActor;
  CONFIG.Actor.dataModels[DOC_SUB_TYPES.character] = data.EtheriaCharacterData;

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
});
