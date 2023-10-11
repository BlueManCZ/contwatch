export const getJsonFetcher = (key: string) =>
    fetch(key, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

export const getJson = (key: string) => getJsonFetcher(key).then((response) => response.json());

export const getArray = (key: string) =>
    getJsonFetcher(key).then((response) => Object.values(response.json()));

export const postJsonFetcher = (key: string, payload: object) =>
    fetch(key, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

export const postJson = (
    key: string,
    payload: any,
    onSuccess?: () => void,
    onError?: (error: any) => void,
) => {
    postJsonFetcher(key, payload)
        .then((response) => {
            if (response.status === 201) {
                onSuccess?.();
            }
        })
        .catch((error) => {
            onError?.(error);
        });
};
