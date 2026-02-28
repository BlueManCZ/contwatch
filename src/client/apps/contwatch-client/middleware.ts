import Negotiator from "negotiator";
import { type NextRequest, NextResponse } from "next/server";

const locales = ["en", "cs"];

function getLocale(request: NextRequest) {
    const languageHeaders = request.headers.get("Accept-Language");
    if (!languageHeaders) return "en";

    return new Negotiator({
        headers: { "accept-language": languageHeaders },
    }).language(locales);
}

export function middleware(request: NextRequest) {
    // Check if there is any supported locale in the pathname
    const { pathname } = request.nextUrl;
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
    );

    if (pathnameHasLocale) return;

    const locale = getLocale(request);
    request.nextUrl.pathname = `/${locale}${pathname}`;

    return NextResponse.rewrite(request.nextUrl);
}

export const config = {
    matcher: [
        // Skip all internal paths
        "/((?!_next|api|server|socket.io|.*\\.).*)",
    ],
};
