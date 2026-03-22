import EtheriaBaseEffect from "../data/active-effect/base-effect.mjs";
import EtheriaActor from "./actor.mjs";
import { ETHERIA } from "../config.mjs";

/**@type {typeof foundry.documents.Combat} */
const Combat = foundry.documents.Combat.implementation;

export default class EtheriaCombat extends Combat {
  /**@inheritdoc */
  async _onEndRound(context) {
    await super._onEndRound(context);
    if (context.round === 0) return;

    const STATUS_CONFIGS = {
      poison: {
        label: "Poison",
        type: "nature",
        mult: 1,
        reduce: (s) => s - 1,
      },
      bleeding: {
        label: "Bleeding",
        type: "true",
        mult: 1,
        reduce: (s) => s - 1,
      },
      burning: {
        label: "Burning",
        type: "fire",
        mult: 2,
        reduce: (s) => Math.floor(s / 2),
      },
      regen: {
        label: "Regeneration",
        type: "heal",
        mult: 1,
        reduce: (s) => s - 1,
      },
    };

    const reportRows = [];

    for (const combatant of this.combatants) {
      /**@type {EtheriaActor} */
      const actor = combatant.actor;
      if (combatant.isDefeated || !actor) continue;

      const recoveryResults = await actor._applyRoundRecovery();
      const recoveryStrings = recoveryResults
        .filter((r) => r.success)
        .map(
          (r) =>
            `<span style="color: green;">${r.diff.signedString()} ${r.resourceKey || ""}</span>`,
        );

      /**@type {Map<keyof ETHERIA.damageTypes | keyof ETHERIA.healingTypes, {dmg: Number, label: String}>} */
      const damageMap = new Map();

      const promises = [];

      const effectFlags = {
        isDecayed: false,
        isBleeding: false,
        hasBleedImmunity: false,
      };

      for (const effect of actor.appliedEffects) {
        const { system, statuses, name } = effect;
        if (!(system instanceof EtheriaBaseEffect)) continue;

        if (statuses.has("decayed")) effectFlags.isDecayed = true;
        if (statuses.has("bleeding")) effectFlags.isBleeding = true;
        if (name === "Immune To Bleeding") effectFlags.hasBleedImmunity = true;

        const { stacks } = system;
        if (stacks <= 0) continue;

        for (const [key, config] of Object.entries(STATUS_CONFIGS)) {
          if (!effect.statuses.has(key)) continue;

          const dmg = stacks * config.mult;
          damageMap.set(config.type, {
            dmg: (damageMap.get(config.type)?.dmg || 0) + dmg,
            label: config.label,
          });

          promises.push(
            effect.update({ "system.stacks": config.reduce(stacks) }),
          );
        }
      }

      const statusStrings = [];
      for (const [type, { dmg, label }] of damageMap) {
        let color = "darkred";
        let sign = -1;
        if (type === "bleeding" && effectFlags.hasBleedImmunity) continue;
        else if (type === "heal") {
          if (effectFlags.isDecayed) continue;
          if (effectFlags.isBleeding) dmg = dmg / 2;
          color = "green";
          sign = 1;
        }
        statusStrings.push(
          `<span style="color: ${color};"> ${(dmg * sign).signedString()} ${label} (${type})</span>`,
        );
        await actor.applyDamage(dmg, type, { chatMessage: false });
      }

      if (promises.length) await Promise.all(promises);

      if (recoveryStrings.length || statusStrings.length) {
        let row = `<strong>${actor.name}</strong>: `;
        const parts = [];
        if (recoveryStrings.length) parts.push(recoveryStrings.join(", "));
        if (statusStrings.length) parts.push(statusStrings.join(", "));

        reportRows.push(row + parts.join(" | "));
      }
    }

    if (reportRows.length > 0) {
      foundry.documents.ChatMessage.implementation.create({
        flavor: `End of Round ${this.round} Summary`,
        content: `<div class="etheria-round-report">
                  ${reportRows.map((r) => `<p style="margin: 0;">${r}</p>`).join("")}
                </div>`,
        speaker: { alias: "System" },
      });
    }
  }
}
