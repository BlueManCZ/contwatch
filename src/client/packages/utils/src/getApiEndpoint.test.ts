import { Endpoint } from "./endpoints";
import { getApiEndpoint } from "./getApiEndpoint";

describe("Bridge - Endpoints", () => {
    test("Correct route form", () => {
        for (const endpoint of Object.values(Endpoint)) {
            expect(endpoint[0] !== "/").toBeTruthy();
            expect(endpoint.slice(-1) !== "/").toBeTruthy();
        }
    });

    test("Correct route generating", () => {
        expect(getApiEndpoint(Endpoint.attributes)).toBe("/api/core/attributes/");
        expect(getApiEndpoint(Endpoint.dataStats)).toBe("/api/core/data-stats/");
    });
});
