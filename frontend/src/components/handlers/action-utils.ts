export function formatActionMessage(message: string): string {
    try {
        const obj = JSON.parse(message);
        if (obj.method || obj.path) {
            const method = obj.method ?? "GET";
            const path = obj.path ?? "/";
            const params = obj.params as Record<string, string> | undefined;
            const qs = params
                ? Object.entries(params)
                      .map(([k, v]) => `${k}=${v}`)
                      .join("&")
                : "";
            return `${method} ${path}${qs ? `?${qs}` : ""}`;
        }
        return Object.entries(obj)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
    } catch {
        return message;
    }
}
