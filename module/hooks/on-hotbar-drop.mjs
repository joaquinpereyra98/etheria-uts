/**
 * A hook event that fires whenever data is dropped into a Hotbar slot.
 * @param {foundry.applications.ui.Hotbar} hotbar - The Hotbar application instance
 * @param {*} data - The dropped data object
 * @param {number} slot - The target hotbar slot
 */
export default function onHotbatDrop(_hotbar, data, slot) {
  if (data.type === "Item") {
    createItemMacro(data, slot);
    return false;
  }
  return;
}

/**
 * @param {*} data - The dropped data object
 * @param {number} slot  - The target hotbar slot
 * @returns
 */
async function createItemMacro(data, slot) {
  const itemData =
    await foundry.documents.Item.implementation.fromDropData(data);
    if (!itemData) {
      ui.notifications.warn("You can only create macro buttons for owned Items");
      return false;
    }
    
    const macroData = {
      name: itemData.name,
      type: CONST.MACRO_TYPES.SCRIPT,
      img: itemData.img,
      command: `const item = await fromUuid("${itemData.uuid}");\nif (item) await item.use();`,
    };
    
  const macro = await foundry.documents.Macro.implementation.create(macroData);

  if (macro) {
    await game.user.assignHotbarMacro(macro, slot);
  }
}
