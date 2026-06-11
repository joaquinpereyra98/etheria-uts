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
    Object.entries(CONFIG.ETHERIA.magicSpheres).map(([k, v]) => [
      k,
      makeScoreField({ label: v.label, ...options }),
    ]),
  );
}

export function createResistancesFields(options = {}) {
  return Object.fromEntries(
    Object.entries(CONFIG.ETHERIA.damageTypes).map(([k, v]) => [
      k,
      makeScoreField({ label: v.label, ...options }),
    ]),
  );
}

export function createSkillsFields(options = {}) {
  return Object.fromEntries(
    Object.entries(CONFIG.ETHERIA.skills).map(([k, v]) => [
      k,
      new fields.SchemaField({
        value: makeScoreField({ label: v.label, ...options }),
      }),
    ]),
  );
}

export function createAttributesFields(options = {}) {
  return Object.fromEntries(
    Object.entries(CONFIG.ETHERIA.attributes).map(([k, v]) => [
      k,
      new fields.SchemaField({
        value: makeScoreField({ label: v.label, ...options }),
      }),
    ]),
  );
}

export function createActionsFields() {
  return Object.fromEntries(
    Object.entries(CONFIG.ETHERIA.actionType)
      .filter(([_, { inActor }]) => inActor)
      .map(([k, { label }]) => [
        k,
        new fields.SchemaField(
          {
            value: new fields.NumberField({ min: 0, initial: 0, step: 1 }),
            max: new fields.NumberField({ min: 0, initial: 0, step: 1 }),
          },
          { label },
        ),
      ]),
  );
}
