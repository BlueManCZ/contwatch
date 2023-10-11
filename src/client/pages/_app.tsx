import "../styles/main.scss";

import type { AppProps } from "next/app";
import { Provider } from "react-redux";

import { StoreInit, wrapper } from "../src/store";

function MyApp({ Component, ...rest }: AppProps) {
    const { store, props } = wrapper.useWrappedStore(rest);
    const { pageProps } = props;

    if (!process.env.NEXT_PUBLIC_API_SERVER_HOST) {
        return (
            <div>
                <h1>API server host address or port not set</h1>
                <h4>
                    Use <code>NEXT_PUBLIC_API_SERVER_HOST</code> and <code>NEXT_PUBLIC_API_SERVER_PORT</code>{" "}
                    variables in .env.local file.
                </h4>
            </div>
        );
    }

    return (
        <Provider store={store}>
            <StoreInit />
            <Component {...pageProps} />
        </Provider>
    );
}

export default MyApp;
