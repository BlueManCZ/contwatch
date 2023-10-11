import { useRouter } from "next/router";
import { FunctionComponent } from "react";

import { Button, ButtonProps, ButtonType, ButtonVariant } from "../Button";

export type LinkButtonProps = Omit<ButtonProps, "type" | "onClick"> & {
    href?: string;
};

export const LinkButton: FunctionComponent<LinkButtonProps> = ({
    variant = ButtonVariant.default,
    expand,
    grow,
    href,
    active,
    icon,
    children,
}) => {
    const router = useRouter();

    return (
        <Button
            type={ButtonType.submit}
            onClick={() => {
                if (href) router.push(href);
            }}
            variant={variant}
            expand={expand}
            grow={grow}
            active={active}
            icon={icon}
        >
            {children}
        </Button>
    );
};
