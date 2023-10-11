import { FC, ReactElement, useState } from "react";

export type BooleanSwitcherChildrenProps = {
    turnOn: () => void;
    turnOff: () => void;
    value: boolean;
};

export type BooleanSwitcherProps = {
    children: (props: BooleanSwitcherChildrenProps) => ReactElement;
};

export const BooleanSwitcher: FC<BooleanSwitcherProps> = ({ children }) => {
    const [value, setValue] = useState<boolean>(false);
    const turnOn = () => setValue(true);
    const turnOff = () => setValue(false);
    return children({ turnOn, turnOff, value });
};
