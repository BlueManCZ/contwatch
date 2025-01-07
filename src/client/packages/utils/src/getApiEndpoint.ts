export const getApiEndpoint = (endpoint: string, suffix = "", prefix = "/api") =>
    `${prefix}/${endpoint}${suffix}`;
