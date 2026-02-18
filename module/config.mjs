/**
 * The Etheria System Configuration
 */
export const ETHERIA = {};

ETHERIA.magicSpheres = {
  arcane: { label: "Arcane" },
  blood: { label: "Blood" },
  chaos: { label: "Chaos" },
  earth: { label: "Earth" },
  entropy: { label: "Entropy" },
  fire: { label: "Fire" },
  frost: { label: "Frost" },
  holy: { label: "Holy" },
  lightning: { label: "Lightning" },
  nature: { label: "Nature" },
  necromancy: { label: "Necromancy" },
  necropotency: { label: "Necropotency" },
  water: { label: "Water" },
  wind: { label: "Wind" },
};

ETHERIA.basicDamages = {
  bludgeoning: { label: "Bludgeoning" },
  slashing: { label: "Slashing" },
  piercing: { label: "Piercing" },
};

ETHERIA.resistances = {
  arcane: { label: "Arcane" },
  blood: { label: "Blood" },
  chaos: { label: "Chaos" },
  earth: { label: "Earth" },
  entropy: { label: "Entropy" },
  fire: { label: "Fire" },
  frost: { label: "Frost" },
  holy: { label: "Holy" },
  lightning: { label: "Lightning" },
  nature: { label: "Nature" },
  necromancy: { label: "Necromancy" },
  necrotic: { label: "Necrotic" },
  water: { label: "Water" },
  wind: { label: "Wind" },
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
