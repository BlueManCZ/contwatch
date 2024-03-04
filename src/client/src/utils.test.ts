import { bemClassNames, capitalize } from "./utils";

describe("Utils", () => {
    it("BEM ClassNames", () => {
        const bem = bemClassNames("a");
        for (const row of [
            [[], "a"],
            [["b"], "a__b"],
            [[{ c: true }], "a a--c"],
            [[{ c: "d" }], "a a--c-d"],
            [[{ c: "d", e: "f" }], "a a--c-d a--e-f"],
            [["b", { c: true }], "a__b a__b--c"],
            [["b", { c: "d" }], "a__b a__b--c-d"],
            [["b", { c: "d", e: "f" }], "a__b a__b--c-d a__b--e-f"],
        ]) {
            expect(bem(row[0][0], row[0][1])).toBe(row[1]);
        }
    });

    it("Capitalize", () => {
        for (const row of [
            ["abc", "Abc"],
            ["Abc", "Abc"],
            [".abc", ".abc"],
            ["abc abc", "Abc abc"],
        ]) {
            expect(capitalize(row[0])).toBe(row[1]);
        }
    });
});
