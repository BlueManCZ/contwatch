import { FC } from "react";

import { Flex, FlexProps } from "../../components/Flex/Flex";

export const Column: FC<FlexProps> = (props) => {
    return <Flex direction="column" {...props} />;
};

export const GroupBox: FC<FlexProps> = (props) => {
    return <Column padding="groupbox" variant="card" {...props} />;
};

export const Content: FC<FlexProps> = (props) => {
    return <Column padding="content" {...props} />;
};
