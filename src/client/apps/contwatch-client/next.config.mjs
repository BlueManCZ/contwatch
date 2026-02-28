/** @type {import('next').NextConfig} */
import { HOST, PORT, PROTOCOL } from "./src/settings.mjs";

const nextConfig = {
    output: "standalone",
    eslint: {
        ignoreDuringBuilds: true,
    },
    async rewrites() {
        return {
            afterFiles: [
                {
                    source: "/socket.io/:path*",
                    destination: `${PROTOCOL}://${HOST}:${PORT}/socket.io/:path*/`,
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
