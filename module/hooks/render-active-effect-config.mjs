/**
 * A hook event that fires whenever an ActiveEffectConfig is rendered.
 * @param {foundry.applications.sheets.ActiveEffectConfig} application - The Application instance being rendered
 * @param {HTMLElement} element - The inner HTML of the document that will be displayed and may be modified
 * @param {foundry.applications.types.ApplicationRenderContext} context - The application rendering context data
 * @param {foundry.applications.types.ApplicationRenderOptions} options - The application rendering options
 */
export default function onRenderActiveEffectConfig(application, element) {
  const effect = application.document;
  const systemFields = effect.system.schema.fields;

  const targetContainer =
    element.querySelector('.tab[data-tab="details"]') ||
    element.querySelector("section");
  if (!targetContainer) return;

  const applyHTML = systemFields.apply.toFormGroup(
    {},
    {
      value: effect.system.apply,
      name: "system.apply",
    },
  ).outerHTML;

  const targetHTML = systemFields.target.toFormGroup(
    {},
    {
      value: effect.system.target,
      name: "system.target",
    },
  ).outerHTML;

  targetContainer.insertAdjacentHTML("afterbegin", `
    ${applyHTML}
    ${targetHTML}
  `);
}
