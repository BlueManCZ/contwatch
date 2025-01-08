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
        expect(getApiEndpoint(Endpoint.attributes, 1, "/test")).toBe("/test/core/attributes/1");
        expect(getApiEndpoint(Endpoint.handlers, 1)).toBe("/api/core/handlers/1");
        expect(getApiEndpoint(Endpoint.dataStats)).toBe("/api/core/data-stats");
    });
});
