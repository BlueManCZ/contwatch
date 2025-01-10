import type { APIModel } from "@repo/types/APIModel";
import { jsonFetcher } from "@repo/utils/communication";
import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";
import { io } from "socket.io-client";
import type { MutatorCallback } from "swr";
import type { MutatorOptions } from "swr/_internal";

import { fetchJson } from "../../src/utils";
import { customMutate, customSWR } from "./swrUtils";

// TODO: Replace biome-ignore with biome-ignore-start when biome 2.0 is released
// https://github.com/biomejs/biome/pull/4649

// biome-ignore lint/complexity/noStaticOnlyClass: We use this static class as a base class for other API classes to abstract away the endpoints
export class API {
    static endpoint(id?: number) {
        return getApiEndpoint("/override-this", id);
    }

    static fetch<T extends APIModel | number>(): Promise<T[]>;
    static fetch<T extends APIModel | number>(id: number): Promise<T>;
    static fetch<T extends APIModel | number>(id?: number) {
        // biome-ignore lint/complexity/noThisInStatic: We are overriding endpoint in subclasses
        return fetchJson<T>(this.endpoint(id));
    }

    static mutate<Data = unknown, T = Data>(
        id?: number,
        data?: T | Promise<T> | MutatorCallback<T>,
        opts?: boolean | MutatorOptions<Data, T>,
    ) {
        // biome-ignore lint/complexity/noThisInStatic: We are overriding endpoint in subclasses
        return customMutate(this.endpoint(id), data, opts);
    }

    static async update<T extends APIModel>(data: T, onSuccess?: (response: Response) => void) {
        // biome-ignore lint/complexity/noThisInStatic: We are overriding endpoint in subclasses
        return this.mutate(data.id, data, {
            optimisticData: data,
            revalidate: false,
            populateCache: true,
            rollbackOnError: false,
        }).then(() =>
            // biome-ignore lint/complexity/noThisInStatic: We are overriding endpoint in subclasses
            jsonFetcher(this.endpoint(data.id), "PUT", data).then((r) => {
                // biome-ignore lint/complexity/noThisInStatic: We are overriding endpoint in subclasses
                this.mutate(data.id, data).then(() => {
                    onSuccess?.(r);
                });
            }),
        );
    }

    public static use<T>(): { data: T[] }; // TODO: Can return undefined
    public static use<T>(id: number): { data: T }; // TODO: Can return undefined
    public static use<T>(id?: number) {
        // biome-ignore lint/complexity/noThisInStatic: We are overriding endpoint in subclasses
        return customSWR<T>(this.endpoint(id));
    }
}

export class Handlers extends API {
    static override endpoint = (id?: number) => getApiEndpoint(Endpoint.handlers, id);
}

export class Attributes extends API {
    static override endpoint = (id?: number) => getApiEndpoint(Endpoint.attributes, id);
}

export class DataStats extends API {
    static override endpoint = () => getApiEndpoint(Endpoint.dataStats);
}

export const socket = io();

socket.on("mutate", (endpoint: string) => {
    console.log("Mutating", endpoint);
    customMutate(getApiEndpoint(endpoint));
});
