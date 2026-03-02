interface UnitEntry {
    unit: string;
    factor: number;
}

const UNIT_FAMILIES: UnitEntry[][] = [
    [
        { unit: "µA", factor: 0.000001 },
        { unit: "mA", factor: 0.001 },
        { unit: "A", factor: 1 },
        { unit: "kA", factor: 1000 },
    ],
    [
        { unit: "mW", factor: 0.001 },
        { unit: "W", factor: 1 },
        { unit: "kW", factor: 1000 },
        { unit: "MW", factor: 1000000 },
    ],
    [
        { unit: "Wh", factor: 1 },
        { unit: "kWh", factor: 1000 },
        { unit: "MWh", factor: 1000000 },
    ],
    [
        { unit: "mV", factor: 0.001 },
        { unit: "V", factor: 1 },
        { unit: "kV", factor: 1000 },
    ],
    [
        { unit: "mHz", factor: 0.001 },
        { unit: "Hz", factor: 1 },
        { unit: "kHz", factor: 1000 },
        { unit: "MHz", factor: 1000000 },
        { unit: "GHz", factor: 1000000000 },
    ],
    [
        { unit: "Pa", factor: 1 },
        { unit: "hPa", factor: 100 },
        { unit: "kPa", factor: 1000 },
        { unit: "MPa", factor: 1000000 },
    ],
    [
        { unit: "mΩ", factor: 0.001 },
        { unit: "Ω", factor: 1 },
        { unit: "kΩ", factor: 1000 },
        { unit: "MΩ", factor: 1000000 },
    ],
    [
        { unit: "mAh", factor: 0.001 },
        { unit: "Ah", factor: 1 },
        { unit: "kAh", factor: 1000 },
    ],
    [
        { unit: "B", factor: 1 },
        { unit: "kB", factor: 1000 },
        { unit: "MB", factor: 1000000 },
        { unit: "GB", factor: 1000000000 },
        { unit: "TB", factor: 1000000000000 },
    ],
];

interface UnitLookup {
    family: UnitEntry[];
    entry: UnitEntry;
}

const UNIT_MAP = new Map<string, UnitLookup>();
for (const family of UNIT_FAMILIES) {
    for (const entry of family) {
        UNIT_MAP.set(entry.unit, { family, entry });
    }
}

function roundValue(value: number, rounding?: number | null): string {
    if (rounding != null) {
        return value.toFixed(rounding);
    }
    // Smart default: up to 2 decimal places, strip trailing zeros
    const rounded = Math.round(value * 100) / 100;
    return String(rounded);
}

export interface FormattedValue {
    value: string;
    unit: string;
}

export function formatValue(value: number, unit: string, rounding?: number | null): FormattedValue {
    const lookup = UNIT_MAP.get(unit);
    if (!lookup) {
        return { value: roundValue(value, rounding), unit };
    }

    const { family, entry } = lookup;

    // Convert to the base unit of the family (factor = 1 equivalent)
    const baseValue = value * entry.factor;
    const absBase = Math.abs(baseValue);

    // Find the best unit: largest factor where |scaled| >= 1
    // Fall back to the smallest unit in the family
    let best = family[0];
    for (const candidate of family) {
        if (absBase >= candidate.factor || candidate === family[0]) {
            best = candidate;
        }
    }

    // Special case: value is 0 — keep the configured unit
    if (value === 0) {
        return { value: roundValue(0, rounding), unit };
    }

    const scaled = baseValue / best.factor;
    return { value: roundValue(scaled, rounding), unit: best.unit };
}
