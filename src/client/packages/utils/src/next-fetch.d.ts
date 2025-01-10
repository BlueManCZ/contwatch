import type { NextFetchRequestConfig } from "next/server";

declare global {
    interface RequestInit {
        next?: NextFetchRequestConfig;
    }
}
