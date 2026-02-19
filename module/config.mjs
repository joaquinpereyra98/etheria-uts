import { ASSETS_PATH } from "./constants.mjs";

/**
 * The Etheria System Configuration
 */
export const ETHERIA = {};

ETHERIA.magicSpheres = {
  arcane: { label: "Arcane", icon: `${ASSETS_PATH}/damage-icons/Arcane.webp` },
  blood: { label: "Blood", icon: `${ASSETS_PATH}/damage-icons/Blood.webp` },
  chaos: { label: "Chaos", icon: `${ASSETS_PATH}/damage-icons/Chaos.webp` },
  earth: { label: "Earth", icon: `${ASSETS_PATH}/damage-icons/Earth.webp` },
  entropy: { label: "Entropy", icon: `${ASSETS_PATH}/damage-icons/Entropy.webp` },
  fire: { label: "Fire", icon: `${ASSETS_PATH}/damage-icons/Fire.webp` },
  frost: { label: "Frost", icon: `${ASSETS_PATH}/damage-icons/Frost.webp` },
  holy: { label: "Holy", icon: `${ASSETS_PATH}/damage-icons/Holy.webp` },
  lightning: { label: "Lightning", icon: `${ASSETS_PATH}/damage-icons/Lightning.webp` },
  nature: { label: "Nature", icon: `${ASSETS_PATH}/damage-icons/Nature.webp` },
  necromancy: { label: "Necromancy", icon: `${ASSETS_PATH}/damage-icons/Necromancy.webp` },
  necropotency: {
    label: "Necropotency",
    icon: `${ASSETS_PATH}/damage-icons/Necropotency.webp`,
  },
  water: { label: "Water", icon: `${ASSETS_PATH}/damage-icons/Water.webp` },
  wind: { label: "Wind", icon: `${ASSETS_PATH}/damage-icons/Wind.webp` },
};

ETHERIA.basicDamages = {
  bludgeoning: {
    label: "Bludgeoning",
    icon: `${ASSETS_PATH}/damage-icons/Bludgeoning.webp`,
  },
  slashing: { label: "Slashing", icon: `${ASSETS_PATH}/damage-icons/Slashing.webp` },
  piercing: { label: "Piercing", icon: `${ASSETS_PATH}/damage-icons/Piercing.webp` },
};

ETHERIA.resistances = {
  arcane: { label: "Arcane", icon: `${ASSETS_PATH}/damage-icons/Arcane.webp` },
  blood: { label: "Blood", icon: `${ASSETS_PATH}/damage-icons/Blood.webp` },
  chaos: { label: "Chaos", icon: `${ASSETS_PATH}/damage-icons/Chaos.webp` },
  earth: { label: "Earth", icon: `${ASSETS_PATH}/damage-icons/Earth.webp` },
  entropy: { label: "Entropy", icon: `${ASSETS_PATH}/damage-icons/Entropy.webp` },
  fire: { label: "Fire", icon: `${ASSETS_PATH}/damage-icons/Fire.webp` },
  frost: { label: "Frost", icon: `${ASSETS_PATH}/damage-icons/Frost.webp` },
  holy: { label: "Holy", icon: `${ASSETS_PATH}/damage-icons/Holy.webp` },
  lightning: { label: "Lightning", icon: `${ASSETS_PATH}/damage-icons/Lightning.webp` },
  nature: { label: "Nature", icon: `${ASSETS_PATH}/damage-icons/Nature.webp` },
  necromancy: { label: "Necromancy", icon: `${ASSETS_PATH}/damage-icons/Necromancy.webp` },
  necrotic: { label: "Necrotic", icon: `${ASSETS_PATH}/damage-icons/Necropotency.webp` },
  water: { label: "Water", icon: `${ASSETS_PATH}/damage-icons/Water.webp` },
  wind: { label: "Wind", icon: `${ASSETS_PATH}/damage-icons/Wind.webp` },
};

ETHERIA.attributes = {
  strength: { label: "Strength", abrr: "str" },
  agility: { label: "Agility", abrr: "agi" },
  presence: { label: "Presence", abrr: "pre" },
  intellect: { label: "Intellect", abrr: "int" },
  wisdom: { label: "Wisdom", abrr: "wis" },
  constitution: { label: "Constitution", abrr: "con" },
  speed: { label: "Speed", abrr: "spe" },
};

ETHERIA.skills = {
  athletics: { label: "Athletics", attribute: "strength" },
  intimidate: { label: "Intimidate", attribute: "strength" },
  jump: { label: "Jump", attribute: "strength" },

  acrobatics: { label: "Acrobatics", attribute: "agility" },
  escapeArtist: { label: "Escape Artist", attribute: "agility" },
  reflex: { label: "Reflex", attribute: "agility" },
  sleightOfHand: { label: "Sleight of Hand", attribute: "agility" },
  stealth: { label: "Stealth", attribute: "agility" },

  bluff: { label: "Bluff", attribute: "presence" },
  mercantile: { label: "Mercantile", attribute: "presence" },
  perform: { label: "Perform", attribute: "presence" },
  persuasion: { label: "Persuasion", attribute: "presence" },

  arcana: { label: "Arcana", attribute: "intellect" },
  concentration: { label: "Concentration", attribute: "intellect" },
  forgery: { label: "Forgery", attribute: "intellect" },
  history: { label: "History", attribute: "intellect" },
  investigation: { label: "Investigation", attribute: "intellect" },
  nature: { label: "Nature", attribute: "intellect" },
  religion: { label: "Religion", attribute: "intellect" },

  endurance: { label: "Endurance", attribute: "constitution" },
  will: { label: "Will", attribute: "constitution" },

  accuracy: { label: "Accuracy", attribute: "wisdom" },
  medicine: { label: "Medicine", attribute: "wisdom" },
  perception: { label: "Perception", attribute: "wisdom" },
  survival: { label: "Survival", attribute: "wisdom" },
};
