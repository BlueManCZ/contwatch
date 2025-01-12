import type { APIModel } from "@repo/types/APIModel";
import { jsonFetcher } from "@repo/utils/communication";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";
import { io } from "socket.io-client";
import type { MutatorCallback } from "swr";
import type { MutatorOptions } from "swr/_internal";

import { fetchJson } from "../../src/utils";
import { customMutate, customSWR } from "./swrUtils";

export type APIModelEndpointConfig = { key: string; id?: number | string; params?: Record<string, string> };
export type APIModelEndpointConfigOverride = Omit<APIModelEndpointConfig, "key">;

export class APIModelEndpoint {
    private readonly config: APIModelEndpointConfig;

    constructor(config: APIModelEndpointConfig) {
        this.config = config;
    }

    private _configMerge(config?: APIModelEndpointConfigOverride) {
        return {
            ...this.config,
            ...config,
        };
    }

    public endpoint(config?: APIModelEndpointConfigOverride): string {
        const c = this._configMerge(config);
        return `${c.key}${c.id ? `/${c.id}` : ""}${c.params ? `?${new URLSearchParams(c.params).toString()}` : ""}`;
    }

    public fetch<T>(config?: APIModelEndpointConfigOverride) {
        return fetchJson<T>(this.endpoint(config));
    }

    public mutate<Data = unknown, T = Data>(
        config?: APIModelEndpointConfigOverride,
        data?: T | Promise<T> | MutatorCallback<T>,
        opts?: boolean | MutatorOptions<Data, T>,
    ) {
        return customMutate(this.endpoint(config), data, opts);
    }

    public async update<T extends APIModel | APIModel[]>(
        data: T | Promise<T> | MutatorCallback<T>,
        onSuccess?: (response: Response) => void,
        config?: APIModelEndpointConfigOverride,
    ) {
        return this.mutate(config, data, {
            optimisticData: data instanceof Function ? undefined : data,
            revalidate: false,
            populateCache: true,
            rollbackOnError: false,
        }).then(() =>
            jsonFetcher(this.endpoint(config), "PUT", data).then((r) => {
                this.mutate(config, data).then(() => {
                    onSuccess?.(r);
                });
            }),
        );
    }

    public use<T>(config?: APIModelEndpointConfigOverride) {
        return customSWR<T>(this.endpoint(config));
    }
}

export const socket = io();

socket.on("mutate", (endpoint: string) => customMutate(getApiEndpoint(endpoint)));
