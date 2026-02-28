/**
 * Returns the correct form of a unit based on the value.
 * TODO: Unit test
 * @param value The value to be checked
 * @param config Configuration object
 */
export default function pluralizeUnit(
    value: number,
    config: { zero?: string; singular?: string; semiSingular?: string; plural?: string } = {},
) {
    if (value === 0) {
        return config.zero || config.plural || config.singular;
    }
    if (value === 1) {
        return config.singular || config.plural;
    }
    if (value > 1 && value < 5) {
        return config.semiSingular || config.plural || config.singular;
    }
    return config.plural || config.semiSingular || config.singular;
}
