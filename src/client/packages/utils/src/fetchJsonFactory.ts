export const fetchJsonFactory =
    (host: string, port: string, protocol: string) =>
    async (endpoint: string): Promise<any> => {
        const url = `${protocol}://api.${host}:${port}/${endpoint}/`;
        // @ts-ignore
        const response = await fetch(url, { cache: "force-cache", next: { revalidate: 3600 } });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}`);
        }
        return response.json();
    };
