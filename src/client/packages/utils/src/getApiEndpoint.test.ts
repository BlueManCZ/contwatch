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
        expect(getApiEndpoint(Endpoint.dataStats)).toBe("/api/core/data-stats");
        expect(getApiEndpoint(Endpoint.handlers, 1)).toBe("/api/core/handlers/1");
        expect(getApiEndpoint(Endpoint.handlers, undefined, { filter: "test" })).toBe(
            "/api/core/handlers?filter=test",
        );
        expect(getApiEndpoint(Endpoint.handlers, 1, { filter: "test" })).toBe(
            "/api/core/handlers/1?filter=test",
        );
        expect(getApiEndpoint(Endpoint.attributes, 1, undefined, "/test")).toBe("/test/core/attributes/1");
        expect(getApiEndpoint(Endpoint.attributes, 1, { filter: "test" }, "/test")).toBe(
            "/test/core/attributes/1?filter=test",
        );
    });
});
