export const getApiEndpoint = (endpoint: string, suffix?: string | number, prefix = "/api") =>
    `${prefix}/${endpoint}${suffix ? `/${suffix}` : ""}`;
