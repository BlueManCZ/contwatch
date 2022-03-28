export function get(url: string, callback: (request: XMLHttpRequest) => void) {
    req(url, "GET", callback);
}

export function post(url: string, callback: (request: XMLHttpRequest) => void, data: Record<string, string | number | boolean> | FormData = {}, header: "" | "JSON" = "") {
    req(url, "POST", callback, data, header);
}

export function del(url: string, callback: (request: XMLHttpRequest) => void) {
    req(url, "DELETE", callback);
}

export function req(url: string, method: "GET" | "POST" | "DELETE", callback: (request: XMLHttpRequest) => void, data: Record<string, string | number | boolean> | FormData = {}, header: "" | "JSON" = "") {
    const request = new XMLHttpRequest();
    request.onload = () => {
        callback(request);
    };
    request.open(method, url);
    switch (header) {
    case "":
        request.send(data as FormData);
        break;
    case "JSON":
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify(data));
    }
}
