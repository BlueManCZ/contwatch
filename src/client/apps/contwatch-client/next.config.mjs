/** @type {import('next').NextConfig} */

const HOST = process.env.NEXT_PUBLIC_API_SERVER_HOST ?? "localhost";
const PORT = process.env.NEXT_PUBLIC_API_SERVER_PORT ?? "5000";
const PROTOCOL = process.env.NEXT_PUBLIC_API_SERVER_PROTOCOL ?? "http";

const nextConfig = {
    // output: "standalone",
    experimental: {
        turbo: {
            useSwcCss: true,
        },
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    async rewrites() {
        return {
            afterFiles: [
                {
                    source: "/media/:path*",
                    destination: `${PROTOCOL}://${HOST}:${PORT}/media/:path*/`,
                },
                {
                    source: "/api/:path*",
                    destination: `${PROTOCOL}://${HOST}:${PORT}/api/:path*/`,
                },
            ],
        };
    },
};

export default nextConfig;
