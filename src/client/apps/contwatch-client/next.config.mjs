/** @type {import('next').NextConfig} */
import { HOST, PORT, PROTOCOL } from "./src/settings.mjs";

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
