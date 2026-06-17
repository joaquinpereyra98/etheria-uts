import EtheriaRollDialog from "../../applications/dialog/roll-dialog.mjs";
import {
  DOC_SUB_TYPES,
  EVALUATION_STATES,
  TEMPLATE_PATH,
} from "../../constants.mjs";
import EtheriaTargetedMessageMixin from "./mixin/targeted-messages.mjs";
import EtheriaRollMessage from "./rolls.mjs";

export default class EtheriaAccuracyMessage extends EtheriaTargetedMessageMixin(
  EtheriaRollMessage,
) {
  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      type: DOC_SUB_TYPES.messages.accuracy,
      actions: {
        promptGMForRoll: EtheriaAccuracyMessage.#onPromptGMForRoll,
        reEvaluateRoll: EtheriaAccuracyMessage.#onReEvaluateRoll,
        rollDefense: EtheriaAccuracyMessage.#onRollDefense,
        applyDamage: EtheriaAccuracyMessage.#onApplyDamage,
        rollDefenseAll: EtheriaAccuracyMessage.#onRollDefenseAll,
        applyDamageAll: EtheriaAccuracyMessage.#onApplyDamageAll,
      },
    });
  }

  /**@inheritdoc */
  static defineSchema() {
    const { fields } = foundry.data;
    return foundry.utils.mergeObject(super.defineSchema(), {
      accuracy: new fields.SchemaField({
        rolls: new fields.ArrayField(new fields.JSONField()),
        evaluation: new fields.StringField({
          required: true,
          choices: Object.values(EVALUATION_STATES),
          initial: EVALUATION_STATES.IDLE,
        }),
      }),
      damages: new fields.SchemaField({
        rolls: new fields.ArrayField(new fields.JSONField()),
        evaluation: new fields.StringField({
          required: true,
          choices: Object.values(EVALUATION_STATES),
          initial: EVALUATION_STATES.IDLE,
        }),
      }),
    });
  }

  /** @override */
  async _prepareContext(context) {
    await super._prepareContext(context);
    context.hasDamage = this.damages.rolls.length > 0;
    context.isIdle = this.evaluation === EVALUATION_STATES.IDLE;
    context.isPending = this.evaluation === EVALUATION_STATES.PENDING;
    context.isEvaluated = this.evaluation === EVALUATION_STATES.EVALUATED;

    const accAction = {
      icon: "fa-dice-d20",
      label: "Roll Accuracy",
      disabled: false,
    };

    if (context.isPending) {
      if (context.isGM) {
        accAction.label = "Open prompt for GM Again";
      } else {
        accAction.icon = "fa-loader fa-spin";
        accAction.label = "Waiting for GM Intervention...";
        accAction.disabled = true;
      }
    } else if (context.isEvaluated) {
      accAction.icon = "fa-circle-check";
      accAction.label = "Accuracy Evaluated";
      accAction.disabled = true;
    }

    context.accAction = accAction;

    context.acc = this._getRollContext(this.accuracy.evaluation, "Accuracy");
    context.damages = this._getRollContext(this.damages.evaluation, "Damages");
  }

  _getRollContext(state, label) {
    const isIdle = state === EVALUATION_STATES.IDLE;
    const isPending = state === EVALUATION_STATES.PENDING;
    const isEvaluated = state === EVALUATION_STATES.EVALUATED;
    const icon = isIdle
      ? "fa-dice-d20"
      : isPending
        ? "fa-loader fa-spin"
        : "fa-circle-check";
    const buttonLabel = isIdle
      ? `Roll ${label}`
      : isPending
        ? "Waiting..."
        : `${label} Evaluated`;
    return {
      isIdle,
      isPending,
      isEvaluated,
      icon,
      buttonLabel,
    };
  }

  /** @inheritdoc */
  async _renderHTML(element, context) {
    const template = `${TEMPLATE_PATH}/chat-messages/accuracy.hbs`;
    const html = await foundry.applications.handlebars.renderTemplate(
      template,
      context,
    );
    element.insertAdjacentHTML("beforeend", html);
  }

  /**
   *
   * @this {EtheriaAccuracyMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onPromptGMForRoll(_event, target) {
    if (game.users.activeGM === null) {
      ui.notifications.warn("No active GM found");
      return;
    }

    const { type } = target.dataset;

    const currentPropmt = foundry.applications.instances
      .values()
      .find((a) => a.messageId === this.parent.id);

    if (currentPropmt) {
      return currentPropmt.render({ force: true });
    }

    await this.parent.update({
      [`system.${type}.evaluation`]: EVALUATION_STATES.PENDING,
    });

    const rollsToEvaluate = this[type].rolls.map((r) =>
      foundry.dice.Roll.fromData(r),
    );

    const evaluatedRolls = [];

    for (const rollToEvaluate of rollsToEvaluate) {
      const { roll } = await EtheriaRollDialog.query(game.users.activeGM, {
        roll: rollToEvaluate,
        messageId: this.parent.id,
        type,
        window: {
          title: `Config Roll: ${type.capitalize()}`,
        },
      });

      evaluatedRolls.push(roll);
    }

    const otherType = type === "accuracy" ? "damages" : "accuracy";
    const otherRolls = this[otherType].rolls;

    const allRolls = (
      type === "accuracy"
        ? [...evaluatedRolls, ...otherRolls]
        : [...otherRolls, ...evaluatedRolls]
    ).filter((r) => r.evaluated || r._evaluated);

    await this.parent.update({
      [`system.${type}.evaluation`]: EVALUATION_STATES.EVALUATED,
      [`system.${type}.rolls`]: evaluatedRolls,
      rolls: allRolls,
    });

    game.audio.play(CONFIG.sounds.dice, { context: game.audio.interface });
  }

  /**
   * Handles the re-evaluation of a dice roll.
   * @this {EtheriaAccuracyMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onReEvaluateRoll(event, target) {
    if (!event.shiftKey) {
      const confirm = await foundry.applications.api.Dialog.confirm({
        title: "Re-evaluate Roll",
        content: `
          <p>Are you sure you want to re-evaluate this roll?</p>
          <p><strong>Warning:</strong> The current roll data will be permanently overwritten to finish.</p>
        `,
      });

      if (!confirm) return;
    }

    return await EtheriaAccuracyMessage.#onPromptGMForRoll.call(
      this,
      event,
      target,
    );
  }

  /**
   * Rolls the specified defense for a specific targeted actor.
   * @this {EtheriaAccuracyMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onRollDefense(_event, target) {
    const { uuid } = target.closest("[data-uuid]")?.dataset ?? {};
    /**@type {foundry.documents.TokenDocument} */
    const token = await foundry.utils.fromUuid(uuid);
    if (!token?.actor) return;

    const { type } = target.dataset;
    await token.actor.rollDefense(type);
  }

  /**
   * Applies the damage from the message's damage rolls to a targeted actor.
   * It iterates through each damage roll, determines the damage type, and calls
   * the actor's `applyDamage` method.
   * @this {EtheriaAccuracyMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onApplyDamage(_event, target) {
    const { uuid } = target.closest("[data-uuid]")?.dataset ?? {};
    if (!uuid) return;

    /**@type {foundry.documents.TokenDocument} */
    const token = await foundry.utils.fromUuid(uuid);
    if (!token?.actor) return;

    const damageRollsData = this.damages.rolls;
    if (!damageRollsData?.length) {
      ui.notifications.info("This attack has no damage to apply.");
      return;
    }

    for (const rollData of damageRollsData) {
      const roll = foundry.dice.Roll.fromData(rollData);
      if (!roll._evaluated) continue;

      const baseDamage = roll.total;
      if (baseDamage <= 0) continue;

      const damageType = roll.options?.damageType ?? "untyped";
      await token.actor.applyDamage(baseDamage, damageType);
    }
  }

  /**
   * Rolls the specified defense for all targeted actors.
   * @this {EtheriaAccuracyMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onRollDefenseAll(_event, target) {
    const { type } = target.dataset;

    for (const uuid of this.targets) {
      const doc = foundry.utils.fromUuidSync(uuid)?.actor;
      if (!doc) continue;
      await doc.rollDefense(type);
    }
  }
  /**
   * Applies all evaluated damage rolls to every targeted actor.
   * @this {EtheriaAccuracyMessage}
   * @type {foundry.applications.types.ApplicationClickAction}
   */
  static async #onApplyDamageAll(_event) {
    const damageRollsData = this.damages.rolls;

    if (!damageRollsData?.length)
      return ui.notifications.info("This attack has no damage to apply.");

    for (const uuid of this.targets) {
      const actor = foundry.utils.fromUuidSync(uuid)?.actor;
      if (!actor) continue;

      for (const rollData of damageRollsData) {
        const roll = foundry.dice.Roll.fromData(rollData);

        if (!roll._evaluated) continue;
        if (roll.total <= 0) continue;

        await actor.applyDamage(
          roll.total,
          roll.options?.damageType ?? "untyped",
        );
      }
    }
  }
}
