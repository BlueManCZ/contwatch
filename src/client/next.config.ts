const HOST = process.env.NEXT_PUBLIC_API_SERVER_HOST ?? "localhost";
const PORT = process.env.NEXT_PUBLIC_API_SERVER_PORT ?? "8000";
const PROTOCOL = process.env.NEXT_PUBLIC_API_SERVER_PROTOCOL ?? "http";

const API_SERVER_ROUTES = ["media", "api"];

// noinspection JSUnusedGlobalSymbols
export const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
        remotePatterns: [
            {
                protocol: PROTOCOL,
                hostname: HOST,
                port: PORT,
                pathname: "/media/**",
            },
        ],
    },
    serverRuntimeConfig: {
        appVersion: process.env.npm_package_version || "",
    },
    async rewrites() {
        return [
            ...API_SERVER_ROUTES.map((route) => ({
                source: `/${route}/:path*`,
                destination: `${PROTOCOL}://${HOST}:${PORT}/${route}/:path*`,
            })),
            {
                source: "/public/:path*",
                destination: "/:path*",
            },
        ];
    },
};

module.exports = nextConfig;
