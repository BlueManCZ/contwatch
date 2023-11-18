import { FC, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSWRConfig } from "swr";

import { addHandler } from "../../bridge";
import { Endpoint, getApiEndpoint } from "../../bridge/endpoints";
import { HandlerTypeModel } from "../../bridge/models";
import { Button, Card, CardBody, FlexLayout, Icon, InputRenderer, ThemedIconName } from "../../components";
import { bemClassNames } from "../../utils";
import {
    resetNewHandler,
    selectConfig,
    selectLabel,
    setConfigField,
    setLabel,
} from "./newHandlerConfigSlice";

const bem = bemClassNames("new-handler");

export const NewHandler: FC<HandlerTypeModel> = ({ type, name, icon, configFields }) => {
    const dispatch = useDispatch();
    const newHandlerConfig = useSelector(selectConfig);
    const newHandlerLAbel = useSelector(selectLabel);
    const { mutate } = useSWRConfig();

    const clearNewHandler = useCallback(() => {
        dispatch(resetNewHandler());
    }, [dispatch]);

    // useEffect(() => {
    //     console.log("Hey, input mounted");
    //     if (configFields) {
    //         for (const field of Object.keys(configFields)) {
    //             dispatch(
    //                 setNewHandlerConfigField({
    //                     fieldName: field,
    //                     fieldValue: configFields[field][2],
    //                 }),
    //             );
    //         }
    //     }
    // }, [configFields, dispatch]);
    useEffect(() => {
        clearNewHandler();
    }, [clearNewHandler, dispatch]);
    return (
        <FlexLayout className={bem()}>
            <Card>
                <CardBody>
                    <FlexLayout className={bem("header")} alignItems="center" gap="10px">
                        <div className={bem("icon")}>
                            <Icon icon={icon} invert={true} />
                        </div>
                        <FlexLayout direction="column">
                            <p className={bem("description")}>Create new handler for</p>
                            <h3 className={bem("title")}>{name}</h3>
                        </FlexLayout>
                    </FlexLayout>
                    <FlexLayout direction="column" gap="15px">
                        <InputRenderer
                            name="label"
                            type="string"
                            title="Handler label"
                            onValueChange={(value) => {
                                console.log(value);
                                dispatch(setLabel(value));
                            }}
                        />
                        {configFields &&
                            Object.keys(configFields).map((field) => (
                                <InputRenderer
                                    key={field}
                                    name={field}
                                    type={configFields[field][0]}
                                    title={configFields[field][1]}
                                    value={""}
                                    onValueChange={(value) => {
                                        console.log(value);
                                        dispatch(
                                            setConfigField({
                                                fieldName: field,
                                                fieldValue: value,
                                            }),
                                        );
                                    }}
                                />
                            ))}
                    </FlexLayout>
                    <Button
                        active={true}
                        icon={ThemedIconName.plus}
                        onClick={() => {
                            console.log("Hey hou", newHandlerConfig, type);
                            addHandler(
                                {
                                    type,
                                    options: {
                                        label: newHandlerLAbel,
                                        config: newHandlerConfig,
                                    },
                                },
                                () => {
                                    clearNewHandler();
                                    mutate(getApiEndpoint(Endpoint.handlers));
                                },
                            );
                        }}
                    >
                        Create handler
                    </Button>
                </CardBody>
            </Card>
        </FlexLayout>
    );
};
