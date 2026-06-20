import { MODULE_ID } from "../constants.mjs";
import EtheriaCharacterData from "../data/character.mjs";

/**
 * A hook event that fires whenever an ActiveEffectConfig is rendered.
 * @param {foundry.applications.sheets.ActiveEffectConfig} application - The Application instance being rendered
 * @param {HTMLElement} element - The inner HTML of the document that will be displayed and may be modified
 * @param {foundry.applications.types.ApplicationRenderContext} context - The application rendering context data
 * @param {foundry.applications.types.ApplicationRenderOptions} options - The application rendering options
 */
export default function onRenderActiveEffectConfig(application, element) {
  const { document } = application;
  const { fields } = document.system.schema;

  const detailsTab = element.querySelector('.tab[data-tab="details"]');
  if (detailsTab) {
    const html = ["apply", "target", "stacks"]
      .map(
        (key) =>
          fields[key].toFormGroup(
            {},
            { value: document.system[key], name: `system.${key}` },
          ).outerHTML,
      )
      .join("");

    detailsTab.insertAdjacentHTML("afterbegin", html);
  }

  const changesTab = element.querySelector("section[data-tab='changes']");
  const keys = document.target?.system?.changesKeys;

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
    changesTab.querySelectorAll(".key input").forEach(
      /** @param {HTMLInputElement} i */ (i) => {
        i.setAttribute("list", listId);
        const li = i.closest("[data-index]");
        if (li) {
          const phaseInput = li.querySelector(
            `[name="system.changes.${li.dataset.index}.phase"]`,
          );

          if (!phaseInput) return;
          if (phaseInput.value !== getPhaseForKey(i.value.trim()))
            phaseInput.value = getPhaseForKey(i.value.trim());
          i.addEventListener("change", (ev) => {
            const selectedKey = ev.target.value.trim();
            const determinedPhase = getPhaseForKey(selectedKey);
            phaseInput.value = determinedPhase;
          });
        }
      },
    );
  }
}

/**
 * Determines the correct calculation phase based on the data field path.
 * @param {string} key - The field path (e.g., "system.skills.accuracy.value")
 * @returns {string} The matching phase name
 */
function getPhaseForKey(key) {
  if (!key) return "initial";

  const matchedRule = EtheriaCharacterData.phaseRules.find((rule) =>
    rule.regexes.some((regex) => regex.test(key)),
  );

  return matchedRule ? matchedRule.phase : "initial";
}
