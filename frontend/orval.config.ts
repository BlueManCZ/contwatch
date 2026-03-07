import { defineConfig } from "orval";

export default defineConfig({
    contwatch: {
        input: {
            target: "http://localhost:8000/api/openapi.json",
        },
        output: {
            mode: "tags-split",
            target: "src/api/generated",
            client: "react-query",
            override: {
                mutator: {
                    path: "src/api/axios-instance.ts",
                    name: "axiosInstance",
                },
            },
        },
    },
});
