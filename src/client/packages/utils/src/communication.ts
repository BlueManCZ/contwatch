export const getJson = (key: string) => jsonFetcher(key).then((response) => response.json());

export const jsonFetcher = (key: string, method: "GET" | "POST" | "DELETE" = "GET", payload?: object) =>
    fetch(key, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken":
                typeof document !== "undefined"
                    ? document.cookie.replace(/(?:^|.*;\s*)csrftoken\s*=\s*([^;]*).*$|^.*$/, "$1")
                    : "",
        },
        body: JSON.stringify(payload),
    });

export const executeRequest = (
    key: string,
    method: "POST" | "DELETE" = "POST",
    payload: any,
    onSuccess?: (response: Response) => void,
    onError?: (error: any) => void,
) => {
    jsonFetcher(key, method, payload)
        .then((response) => {
            if (response.ok) {
                onSuccess?.(response);
            } else {
                onError?.(response);
            }
        })
        .catch((error) => {
            onError?.(error);
            console.error("Error");
        });
};
