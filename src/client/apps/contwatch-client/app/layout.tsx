import "./globals.scss";

import { openSans } from "@repo/ui/fonts";
import { NavbarLayout } from "@repo/ui/NavbarLayout";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import { Providers } from "./providers";

export const metadata: Metadata = {
    title: "ContWatch",
    description: "Scalable system for IoT automation.",
};

export default function RootLayout({ children }: PropsWithChildren) {
    return (
        <html lang="en">
            <body className={openSans.className}>
                <Providers>
                    <NavbarLayout>{children}</NavbarLayout>
                </Providers>
            </body>
        </html>
    );
}
