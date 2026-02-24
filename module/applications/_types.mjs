/**
 * @typedef {foundry.applications.types.ApplicationRenderOptions & {
 * parts?: string[]
 * }} HandlebarsApplicationRenderOptions
 */

/**
 * A callback function to prepare the render context for a specific application part.
 * @callback PartContextCallback
 * @param {foundry.applications.types.ApplicationRenderContext} context - The shared render context.
 * @param {HandlebarsApplicationRenderOptions} options - The specific render options for this part.
 * @returns {Promise<void>|void} - May return a promise if asynchronous logic is required.
 */

/**
 * A callback function to attach event listeners to a specific rendered application part.
 * @callback PartListenerCallback
 * @param {HTMLElement} htmlElement - The rendered HTML element for this specific part.
 * @param {HandlebarsApplicationRenderOptions} options - The specific render options for this part.
 * @returns {void}
 */
