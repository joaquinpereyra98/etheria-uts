import { ETHERIA } from "../config.mjs";

// Helper to access fields safely
const fields = foundry.data.fields;

export function makeScoreField(options = {}) {
  return new fields.NumberField({
    initial: 0,
    integer: true,
    ...options,
  });
}

export function createSphereFields(options = {}) {
  return Object.fromEntries(
    Object.entries(ETHERIA.magicSpheres).map(([k, v]) => [
      k,
      makeScoreField({ label: v.label, ...options }),
    ]),
  );
}

export function createResistancesFields(options = {}) {
  const allResistances = { ...ETHERIA.magicSpheres, ...ETHERIA.basicDamages };

  return Object.fromEntries(
    Object.entries(allResistances).map(([k, v]) => [
      k,
      makeScoreField({ label: v.label, ...options }),
    ]),
  );
}

export function createSkillsFields(options = {}) {
  return Object.fromEntries(
    Object.entries(ETHERIA.skills).map(([k, v]) => [
      k,
      new fields.SchemaField({
        value: makeScoreField({ label: v.label, ...options }),
      }),
    ]),
  );
}

export function createAttributesFields(options = {}) {
  return Object.fromEntries(
    Object.entries(ETHERIA.attributes).map(([k, v]) => [
      k,
      new fields.SchemaField({
        value: makeScoreField({ label: v.label, ...options }),
      }),
    ]),
  );
}
