export const fetchJsonFactory =
    (host: string, port: string, protocol: string) =>
    async (endpoint: string): Promise<object> => {
        const url = `${protocol}://${host}:${port}/${endpoint}`;
        const response = await fetch(url, {
            cache: "no-cache", // TODO: Fetching cache with revalidations
            next: { revalidate: 3600, tags: ["api"] },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}`);
        }
        return response.json();
    };
