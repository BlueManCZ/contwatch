import nextJest from "next/jest";

export const customJestConfig = {
    moduleDirectories: ["node_modules", "<rootDir>/"],
    moduleNameMapper: {
        "@/(.*)$": "<rootDir>/src/$1",
    },
    testEnvironment: "jest-environment-jsdom",
};

const createJestConfig = nextJest({
    dir: "./",
});

module.exports = createJestConfig(customJestConfig);
