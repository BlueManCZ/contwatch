import { bemClassNames } from "./bemClassNames";

describe("Utils", () => {
    it("BEM ClassNames", () => {
        const styles = {
            a: "a#",
            "a--c": "a--c#",
            "a--c-d": "a--c-d#",
            "a--e-f": "a--e-f#",
            a__b: "a__b#",
            "a__b--c": "a__b--c#",
            "a__b--c-d": "a__b--c-d#",
            "a__b--e-f": "a__b--e-f#",
            "a__b--g-1": "a__b--g-1#",
        };
        const bem = bemClassNames(styles);
        for (const row of [
            [[], "a#"],
            [["b"], "a__b#"],
            [[{ c: true }], "a# a--c#"],
            [[{ c: "d" }], "a# a--c-d#"],
            [[{ c: "d", e: "f" }], "a# a--c-d# a--e-f#"],
            [["b", { c: true }], "a__b# a__b--c#"],
            [["b", { c: "d" }], "a__b# a__b--c-d#"],
            [["b", { c: "d", e: "f" }], "a__b# a__b--c-d# a__b--e-f#"],
            [["b", { c: "d", e: "f", g: 1 }], "a__b# a__b--c-d# a__b--e-f# a__b--g-1#"],
        ] as [
            [
                string | number | Record<string, string | number | boolean>,
                Record<string, string | number | boolean> | undefined,
            ],
            string,
        ][]) {
            expect(bem(row?.[0]?.[0], row?.[0]?.[1])).toBe(row[1]);
        }
    });
});
