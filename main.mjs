import * as data from "./module/data/_module.mjs";
import * as documents from "./module/documents/_module.mjs";
import * as applications from "./module/applications/_module.mjs";
import * as hooks from "./module/hooks/_module.mjs";
import * as dice from "./module/dice/_module.mjs";

import { DOC_SUB_TYPES, MODULE_ID, queries } from "./module/constants.mjs";
import { ETHERIA } from "./module/config.mjs";

CONFIG.ETHERIA = ETHERIA;

Hooks.once("init", () => {
  CONFIG.ui[`${MODULE_ID}.ActionBar`] = applications.ux.ActionBar;
  CONFIG.ui[`${MODULE_ID}.ActionsPanel`] = applications.ux.ActionsPanel;
  applications.ux.ActionsPanel.registerSetting();

  foundry.applications.handlebars.loadTemplates({
    effectsFields:
      "modules/etheria-uts/templates/active-effects/effects-fields.hbs",
  });

  CONFIG.Actor.documentClass = documents.EtheriaActor;
  CONFIG.ActiveEffect.documentClass = documents.EtheriaActiveEffect;
  CONFIG.Item.documentClass = documents.EtheriaItem;
  CONFIG.Combat.documentClass = documents.EtheriaCombat;

  CONFIG.Actor.dataModels[DOC_SUB_TYPES.character] = data.EtheriaCharacterData;
  CONFIG.ActiveEffect.dataModels.base = data.effect.EtheriaBaseEffect;
  CONFIG.ActiveEffect.typeLabels.base =
    foundry.documents.ActiveEffect.metadata.label;

  CONFIG.ActiveEffect.phases.afterAttributes = {
    label: "After Attributes",
    hint: "Applied after base attributes and modifiers are computed.",
  };

  CONFIG.Token.documentClass = documents.EtheriaTokenDocument;

  CONFIG.statusEffects.push({
    id: "decayed",
    name: "Decayed",
    img: "icons/svg/stoned.svg",
  });

  for (const model of Object.values(data.messages)) {
    CONFIG.ChatMessage.dataModels[model.metadata.type] = model;
  }

  for (const model of Object.values(data.items)) {
    CONFIG.Item.dataModels[model.metadata.type] = model;
    CONFIG.Item.typeIcons[model.metadata.type] = model.metadata.icon;
  }

  CONFIG.Actor.defaultType = DOC_SUB_TYPES.character;

  CONFIG.Dice.rolls.unshift(dice.Etheriaroll);
  CONFIG.Dice.rolls.push(dice.EtheriaDamageRoll);

  CONFIG.queries[queries.rollDialog] =
    applications.dialog.EtheriaRollDialog._handleQuery;

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

  Handlebars.registerHelper({
    [`${MODULE_ID}-getFluidLevel`]: (v, max) =>
      max > 0 ? Math.clamp(v / max, 0.2, 0.75) : 0.15,
  });
});

Hooks.once("ready", () => {
  foundry.utils.setProperty(game, "system.grid.units", "Tiles");
  ui[`${MODULE_ID}.ActionBar`].render({ force: true });
  ui[`${MODULE_ID}.ActionsPanel`].render({ force: true });

  const modelSnapshot = foundry.utils.deepClone(game.model);

  const { chess, token, ...filteredActor } = modelSnapshot.Actor;
  modelSnapshot.Actor = filteredActor;

  Object.defineProperty(game, "model", {
    value: modelSnapshot,
    writable: false,
    configurable: true,
    enumerable: true,
  });
});

Hooks.on("renderActiveEffectConfig", hooks.onRenderActiveEffectConfig);
Hooks.on("hotbarDrop", hooks.onHotbatDrop);
Hooks.on("updateActor", hooks.onUpdateActor);
Hooks.on("updateUser", hooks.onUpdateUser);
