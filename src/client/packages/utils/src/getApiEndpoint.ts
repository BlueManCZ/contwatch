export const getApiEndpoint = (endpoint: string, suffix: string = "/", prefix: string = "/api") =>
    `${prefix}/${endpoint}${suffix}`;
