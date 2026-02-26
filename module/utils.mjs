export async function enrichHTML(content, options = {}) {
  return await foundry.applications.ux.TextEditor.implementation.enrichHTML(
    content,
    options,
  );
}