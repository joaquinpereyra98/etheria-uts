export async function enrichHTML(content, options = {}) {
  return await foundry.applications.ux.TextEditor.implementation.enrichHTML(
    content,
    options,
  );
}

/**
 *
 * @param {foundry.dice.terms.RollTermData} terms
 * @param {string} parentPath
 * @returns
 */
export function getDiceWithPaths(terms, parentPath = "") {
  if (!Array.isArray(terms)) return [];

  return terms.flatMap((term, index) => {
    const results = [];
    const currentPath = parentPath
      ? `${parentPath}.terms.${index}`
      : `${index}`;

    if (
      term instanceof foundry.dice.terms.RollTerm ||
      term instanceof foundry.dice.Roll
    )
      term = term.toJSON();

    // DiceTerm
    if (Object.values(CONFIG.Dice.terms).some((c) => c.name === term.class)) {
      results.push({ die: term, path: currentPath });
    }

    if (term.dice?.length) {
      term.dice.forEach((d, dIndex) => {
        results.push({ die: d, path: `${currentPath}.dice.${dIndex}` });
      });
    }

    if (term.terms?.length) {
      results.push(...getDiceWithPaths(term.terms, currentPath));
    }

    // FunctionTerm and PoolTerms
    if (term.rolls?.length) {
      const newResults = term.rolls.flatMap((r, rIndex) => {
        const data = r instanceof foundry.dice.Roll ? r.toJSON() : r;

        return data.terms
          ? getDiceWithPaths(data.terms, `${currentPath}.rolls.${rIndex}`)
          : [];
      });

      results.push(...newResults);
    }

    // ParentheticalTerm
    if (term.roll?.terms) {
      const data =
        term.roll instanceof foundry.dice.Roll ? term.roll.toJSON() : term.roll;
      results.push(...getDiceWithPaths(data.terms, `${currentPath}.roll`));
    }

    return results;
  });
}
