import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import configureMockStore from "redux-mock-store";

import { Input } from "./Input";

const mockStore = configureMockStore();
const store = mockStore({ settings: { localeState: "cs-CZ" } });
const makeStoreWithLocale = (locale: string) => mockStore({ settings: { localeState: locale } });

describe("Input behavior", () => {
    const onValueChange = jest.fn();
    const onNumberChange = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("Normal", async () => {
        render(
            <Provider store={store}>
                <Input {...{ onValueChange, onNumberChange }} />
            </Provider>,
        );

        const input = screen.getByRole("textbox");

        // Test that the input is empty by default
        expect(input).toHaveValue("");
        expect(onValueChange).toHaveBeenCalledTimes(0);
        expect(onNumberChange).toHaveBeenCalledTimes(0);

        // Simulate user typing
        await userEvent.type(input, "1234");

        // Test that the input has the correct value and is not formatted
        expect(input).toHaveValue("1234");
        expect(onValueChange).toHaveBeenCalledTimes(4);
        expect(onNumberChange).toHaveBeenCalledTimes(0);
    });

    it("Default value", async () => {
        render(
            <Provider store={store}>
                <Input {...{ value: "1234", onValueChange, onNumberChange }} />
            </Provider>,
        );

        const input = screen.getByRole("textbox");

        // Test that the input has the correct default value and is not formatted
        expect(input).toHaveValue("1234");
        expect(onValueChange).toHaveBeenCalledTimes(0);
        expect(onNumberChange).toHaveBeenCalledTimes(0);
    });

    it("Number", async () => {
        render(
            <Provider store={store}>
                <Input {...{ value: "1", type: "number", onValueChange, onNumberChange }} />
            </Provider>,
        );

        const input = screen.getByRole("textbox");

        // Simulate user typing
        await userEvent.type(input, "234");

        // Test that the input has the correct value and is formatted
        expect(input).toHaveValue("1 234");
        expect(onValueChange).toHaveBeenCalledTimes(3);
        expect(onNumberChange).toHaveBeenCalledTimes(3);

        // Test that control buttons are not rendered by default
        const [down, up] = screen.queryAllByRole("img");
        expect(down).toBeUndefined();
        expect(up).toBeUndefined();
    });

    it("Number with controls", async () => {
        render(
            <Provider store={store}>
                <Input
                    {...{ value: "1000", type: "number", controls: true, onValueChange, onNumberChange }}
                />
            </Provider>,
        );

        const input = screen.getByRole("textbox");
        const [down, up] = screen.getAllByRole("img");

        // Simulate user clicking on the control button
        up && (await userEvent.click(up));
        // Test that the input has the correct value and is formatted
        expect(input).toHaveValue("1 001");

        // Simulate user clicking on the control button
        down && (await userEvent.click(down));
        // Test that the input has the correct value and is formatted
        expect(input).toHaveValue("1 000");
        expect(onValueChange).toHaveBeenCalledTimes(2);
        expect(onNumberChange).toHaveBeenCalledTimes(2);
    });

    it("Number with min and max", async () => {
        render(
            <Provider store={store}>
                <Input
                    {...{ type: "number", min: 0, max: 10, controls: true, onValueChange, onNumberChange }}
                />
            </Provider>,
        );

        const input = screen.getByRole("textbox");
        const [down, up] = screen.getAllByRole("img");

        await userEvent.type(input, "1234");

        expect(input).toHaveValue("10");
        // TODO: Optimize calls?
        expect(onValueChange).toHaveBeenCalledTimes(4);
        expect(onNumberChange).toHaveBeenCalledTimes(4);

        // Simulate user clicking on the control button
        up && (await userEvent.click(up));
        // Test that the input value is not changed
        expect(input).toHaveValue("10");
        // TODO: Optimize calls?
        expect(onValueChange).toHaveBeenCalledTimes(5);
        expect(onNumberChange).toHaveBeenCalledTimes(5);
        // Simulate user clicking on the control button
        down && (await userEvent.click(down));
        // Test that the input value decreased by the step
        expect(input).toHaveValue("9");
        expect(onValueChange).toHaveBeenCalledTimes(6);
        expect(onNumberChange).toHaveBeenCalledTimes(6);
    });

    it("Number with step", async () => {
        render(
            <Provider store={store}>
                <Input
                    {...{
                        type: "number",
                        value: 50,
                        step: 10,
                        controls: true,
                        onValueChange,
                        onNumberChange,
                    }}
                />
            </Provider>,
        );

        const input = screen.getByRole("textbox");
        const [down, up] = screen.getAllByRole("img");

        expect(input).toHaveValue("50");
        expect(onValueChange).toHaveBeenCalledTimes(0);
        expect(onNumberChange).toHaveBeenCalledTimes(0);
        // Simulate user clicking on the control button
        up && (await userEvent.click(up));
        // Test that the input value increased by the step
        expect(input).toHaveValue("60");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onNumberChange).toHaveBeenCalledTimes(1);
        // Simulate user clicking on the control button
        down && (await userEvent.click(down));
        // Test that the input value decreased by the step
        expect(input).toHaveValue("50");
        expect(onValueChange).toHaveBeenCalledTimes(2);
        expect(onNumberChange).toHaveBeenCalledTimes(2);
    });

    it("Number with postponed change and en-US locale", async () => {
        render(
            <Provider store={makeStoreWithLocale("en-US")}>
                <Input
                    {...{ value: "1", type: "number", postponedChanged: true, onValueChange, onNumberChange }}
                />
            </Provider>,
        );

        const input = screen.getByRole("textbox");

        // Simulate user typing
        await userEvent.type(input, "234");

        // Test that the input has the correct value and is formatted
        expect(input).toHaveValue("1,234");
        expect(onValueChange).toHaveBeenCalledTimes(0);
        expect(onNumberChange).toHaveBeenCalledTimes(0);

        // Simulate user clicking outside the input
        await userEvent.click(document.body);

        // Test that the input has the correct value and is formatted
        expect(input).toHaveValue("1,234");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onNumberChange).toHaveBeenCalledTimes(1);

        // Simulate user typing
        await userEvent.type(input, "567");

        // Test that the input has the correct value and is formatted
        expect(input).toHaveValue("1,234,567");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onNumberChange).toHaveBeenCalledTimes(1);

        // Simulate user pressing Enter
        await userEvent.type(input, "{enter}");

        // Test that the input has the correct value and is formatted
        expect(input).toHaveValue("1,234,567");
        expect(onValueChange).toHaveBeenCalledTimes(2);
        expect(onNumberChange).toHaveBeenCalledTimes(2);
    });
});
