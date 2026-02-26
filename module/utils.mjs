import { ETHERIA } from "./config.mjs";

/**
 * Defines a read-only 'value' getter on a specific property within an object.
 * Useful for derived stats like Recovery or Defense that need to update dynamically.
 * @param {object} obj - The target object property to extend.
 * @param {function(): any} fn - The calculation function.
 * @param {object} [options] - Configuration options for the property definition.
 * @param {boolean} [options.enumerable=true] - Whether the property shows up during enumeration (Object.keys, JSON stringify).
 * @param {boolean} [options.configurable=false] - Whether the property descriptor can be changed or deleted later.
 * @param {any} [options.rest] - Additional property descriptor settings.
 */
export function defineValueGetter(
  obj,
  fn,
  { enumerable = true, configurable = false, ...rest } = {},
) {
  Object.defineProperty(obj, "value", {
    get: fn,
    enumerable,
    configurable,
    ...rest,
  });
}

export async function enrichHTML(content, options = {}) {
  return await foundry.applications.ux.TextEditor.implementation.enrichHTML(
    content,
    options,
  );
}