export default class TrackedTOF extends foundry.data.fields.TypedObjectField {
  /**
   * A set containing all current keys present in this field instance.
   * @type {Set<string>}
   */
  trackedKeys = new Set();

  /** @override */
  initialize(value, model, options = {}) {
    const initializedObject = super.initialize(value, model, options);

    this.trackedKeys.clear();
    if (initializedObject && typeof initializedObject === "object") {
      for (const key in initializedObject) {
          this.trackedKeys.add(key);
      }
    }

    return initializedObject;
  }

  /** @override */
  _cleanType(data, options, _state) {
    const cleanedData = super._cleanType(data, options, _state);
    this.trackedKeys.clear();
    if (cleanedData && typeof cleanedData === "object") {
      for (const key in cleanedData) {
        this.trackedKeys.add(key);
      }
    }

    return cleanedData;
  }

  /** @override */
  _updateDiff(key, value, options, state) {
    super._updateDiff(key, value, options, state);

    const diffData = state.diff[key];
    if (diffData && typeof diffData === "object") {
      for (const k in diffData) {
        if (diffData[k] instanceof foundry.data.operators.ForcedDeletion) {
          this.trackedKeys.delete(k);
        } else if (!this.trackedKeys.has(k)) {
          this.trackedKeys.add(k);
        }
      }
    }
  }

}
