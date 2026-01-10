import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
    preset: "ts-jest",
    // transform: {
    //     "^.+\\.[tj]sx?$": "babel-jest",
    // },
    moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
    testEnvironment: "jsdom",
};

export default jestConfig;
