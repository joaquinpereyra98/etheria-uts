import { MODULE_ID } from "../constants.mjs";

/**
 * A hook event that fires whenever an ActiveEffectConfig is rendered.
 * @param {foundry.applications.sheets.ActiveEffectConfig} application - The Application instance being rendered
 * @param {HTMLElement} element - The inner HTML of the document that will be displayed and may be modified
 * @param {foundry.applications.types.ApplicationRenderContext} context - The application rendering context data
 * @param {foundry.applications.types.ApplicationRenderOptions} options - The application rendering options
 */
export default function onRenderActiveEffectConfig(application, element) {
  const { document: effect } = application;
  const { fields } = effect.system.schema;

  const detailsTab =
    element.querySelector('.tab[data-tab="details"]');
    if (detailsTab) {
    const html = ["apply", "target"]
      .map(
        (key) =>
          fields[key].toFormGroup(
            {},
            { value: effect.system[key], name: `system.${key}` },
          ).outerHTML,
      )
      .join("");

    detailsTab.insertAdjacentHTML("afterbegin", html);
  }

  const changesTab = element.querySelector("section[data-tab='changes']");
  const keys = effect.target?.system?.changesKeys;

  if (changesTab && keys) {
    const listId = `${MODULE_ID}-attribute-key-list`;
    const options = [...keys]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => `<option value="${key}">`)
      .join("");
  
    changesTab.insertAdjacentHTML(
      "beforeend",
      `<datalist id="${listId}">${options}</datalist>`,
    );
    changesTab
      .querySelectorAll(".key input")
      .forEach((i) => i.setAttribute("list", listId));
  }

}
