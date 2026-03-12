export const MODULE_ID = "etheria-uts";

export const TEMPLATE_PATH = `modules/${MODULE_ID}/templates`;
export const ASSETS_PATH = `modules/${MODULE_ID}/assets`;

export const queries = {
  rollDialog: `${MODULE_ID}.roll-dialog`
}

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
    item: `${MODULE_ID}.item`,
    accuracy: `${MODULE_ID}.accuracy`,
    effect: `${MODULE_ID}.effect`,
  },
};

/**
 * The possible states for an accuracy check.
 * @enum {string}
 */
export const ACCURACY_STATES = {
  PENDING: "pending",
  HIT: "hit",
  MISS: "miss",
};

/**
 * States representing the lifecycle of a roll evaluation.
 * @enum {string}
 */
export const EVALUATION_STATES = {
  IDLE: "idle",
  PENDING: "pending",
  EVALUATED: "evaluated",
};
