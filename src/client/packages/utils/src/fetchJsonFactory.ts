export const fetchJsonFactory =
    (host: string, port: string, protocol: string) =>
    async <T>(endpoint: string): Promise<T> => {
        const url = `${protocol}://${host}:${port}/${endpoint}`;
        const response = await fetch(url, {
            cache: "force-cache",
            next: { revalidate: 600, tags: ["api"] },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}`);
        }
        return response.json();
    };
