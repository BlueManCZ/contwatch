import { FC } from "react";

import { useHandler } from "../../bridge";
import { getStatusColor } from "../../bridge/models/utils";
import { Button, ButtonVariant, Card, CardBody, FlexLayout, Icon, ThemedIconName } from "../../components";
import { bemClassNames } from "../../utils";

const bem = bemClassNames("handler");

export type HandlerProps = {
    id: number;
};

export const Handler: FC<HandlerProps> = ({ id }) => {
    const { data: handler } = useHandler(id);

    return (
        <Card className={bem()}>
            {handler && (
                <CardBody gap="30px">
                    <FlexLayout className={bem("header")} gap="15px" alignItems="center">
                        <div className={bem("icon", { color: getStatusColor(handler.status) })}>
                            <Icon icon={handler.icon} invert={true} />
                        </div>
                        <FlexLayout direction="column" className={bem("texts")}>
                            <h3 className={bem("title")}>{handler.name}</h3>
                            <p className={bem("description")}>{handler.description}</p>
                        </FlexLayout>
                        {/*<FlexLayout*/}
                        {/*    direction="column"*/}
                        {/*    className={bem("status-button", { color: getStatusColor(handler.status) })}*/}
                        {/*    alignItems="center"*/}
                        {/*>*/}
                        {/*    <span className={bem("status-button-title")}>*/}
                        {/*        {getStatusText(handler.status)}*/}
                        {/*    </span>*/}
                        {/*    <span className={bem("status-button-description")}>*/}
                        {/*        {`Click to ${*/}
                        {/*            handler.status === HandlerStatus.DISABLED ? "enable" : "disable"*/}
                        {/*        } handler`}*/}
                        {/*    </span>*/}
                        {/*</FlexLayout>*/}
                        <Button variant={ButtonVariant.navbar} icon={ThemedIconName.power}></Button>
                    </FlexLayout>
                    <FlexLayout direction="column" gap="10px">
                        {handler.attributes && handler.attributes.length > 0 && (
                            <>
                                <p className={bem("subtitle")}>Stored attributes:</p>
                                <FlexLayout direction="column" gap="10px">
                                    {handler.attributes?.map((attribute) => (
                                        <FlexLayout
                                            key={attribute.id}
                                            className={bem("attribute")}
                                            alignItems="center"
                                        >
                                            <span className={bem("attribute-name")}>{attribute.name}</span>
                                            <span className={bem("attribute-value")}>{attribute.value}</span>
                                        </FlexLayout>
                                    ))}
                                </FlexLayout>
                            </>
                        )}
                    </FlexLayout>
                </CardBody>
            )}
        </Card>
    );
};
