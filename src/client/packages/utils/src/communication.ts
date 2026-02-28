export const getJson = (key: string) => jsonFetcher(key).then((response) => response.json());

export const jsonFetcher = (
    key: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    payload?: object,
) =>
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
