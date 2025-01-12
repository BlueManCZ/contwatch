// TODO: This is a ugly temporary solution
export const getApiEndpoint = (
    endpoint: string,
    suffix?: string | number,
    params?: Record<string, string>,
    prefix = "/api",
) =>
    `${prefix}/${endpoint}${suffix ? `/${suffix}` : ""}${params ? `?${new URLSearchParams(params).toString()}` : ""}`;
