import type { SVGProps } from "react";

export function ContwatchLogo(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 12 12" fill="currentColor" role="img" aria-label="ContWatch" {...props}>
            <rect x="0" y="0" width="4" height="1" />
            <rect x="8" y="0" width="4" height="1" />
            <rect x="0" y="1" width="1" height="3" />
            <rect x="11" y="1" width="1" height="3" />
            <rect x="4" y="4" width="4" height="1" />
            <rect x="4" y="5" width="1" height="3" />
            <rect x="0" y="8" width="1" height="3" />
            <rect x="0" y="11" width="4" height="1" />
        </svg>
    );
}
