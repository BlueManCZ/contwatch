import "./globals.scss";

import type { PageProps } from "@repo/types/PageProps";
import { openSans } from "@repo/ui/fonts";
import { NavbarLayout } from "@repo/ui/NavbarLayout";
import type { Metadata } from "next";
import { type PropsWithChildren, Suspense } from "react";

import { Providers } from "./providers";

export const metadata: Metadata = {
    title: "ContWatch",
    description: "Scalable system for IoT automation.",
};

export async function generateStaticParams() {
    return [{ lang: "cs" }, { lang: "en" }];
}

export default async function RootLayout({ children, params }: PropsWithChildren<PageProps>) {
    const lang = (await params).lang;
    return (
        <html lang={lang}>
            <body className={openSans.className}>
                <Providers lang={lang}>
                    <NavbarLayout>
                        <Suspense>{children}</Suspense>
                    </NavbarLayout>
                </Providers>
            </body>
        </html>
    );
}
