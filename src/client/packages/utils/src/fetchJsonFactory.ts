export const fetchJsonFactory =
    (host: string, port: string, protocol: string) =>
    async <T>(endpoint: string): Promise<T | T[]> => {
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
