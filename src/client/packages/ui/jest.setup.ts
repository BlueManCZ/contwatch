// Mocking the Google font loader
jest.mock("next/font/google", () => {
    return new Proxy(
        {},
        {
            get: () => () => ({
                style: {
                    fontFamily: "mocked",
                },
            }),
        },
    );
});
