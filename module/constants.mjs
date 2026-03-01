export const MODULE_ID = "etheria-uts";

export const TEMPLATE_PATH = `modules/${MODULE_ID}/templates`;
export const ASSETS_PATH = `modules/${MODULE_ID}/assets`;

export const DOC_SUB_TYPES = {
  character: `${MODULE_ID}.character`,
  items: {
    ability: `${MODULE_ID}.ability`,
    armor: `${MODULE_ID}.armor`,
    consumable: `${MODULE_ID}.consumable`,
    misc: `${MODULE_ID}.misc`,
    race: `${MODULE_ID}.race`,
    weapon: `${MODULE_ID}.weapon`,
  },
  messages: {
    roll: `${MODULE_ID}.roll`,
  }
};
