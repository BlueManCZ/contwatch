import { useState } from "react";

import { useAvailableHandlers, useHandlers } from "../src/bridge";
import { getStatusColor } from "../src/bridge/models/utils";
import {
    CustomIconName,
    FlexLayout,
    Menu,
    MenuItem,
    MenuSection,
    Separator,
    SeparatorVariant,
    ThemedIconName,
} from "../src/components";
import { NavbarLayout } from "../src/layouts";
import { Handler, NewHandler } from "../src/partials";

export const Handlers = () => {
    const { data: handlers } = useHandlers();
    const { data: availableHandlers } = useAvailableHandlers();

    const [newHandlerSectionVisible, setNewHandlerSectionVisible] = useState(false);
    const [newHandlerType, setNewHandlerType] = useState<string | null>(null);
    const [currentHandlerId, setCurrentHandlerId] = useState<number | null>(null);

    const newHandler = availableHandlers?.find((handler) => handler.type === newHandlerType);

    const showHandlerInfo = (handlerId: number) => {
        setCurrentHandlerId(handlerId);
        setNewHandlerType(null);
    };

    const showNewHandler = (handlerType: string) => {
        setCurrentHandlerId(null);
        setNewHandlerType(handlerType);
    };

    return (
        <NavbarLayout>
            <FlexLayout direction="row">
                <Menu title="ContWatch" description="Scalable system for IoT automatization">
                    <MenuSection title="Handlers" description="Your configured devices">
                        {handlers?.map((handler) => (
                            <MenuItem
                                key={handler.id}
                                title={handler.name}
                                description={handler.description}
                                colorFlag={getStatusColor(handler.status)}
                                icon={handler.type as CustomIconName}
                                onClick={() => showHandlerInfo(handler.id)}
                                active={currentHandlerId === handler.id}
                            />
                        ))}
                        <Separator variant={SeparatorVariant.menu} />
                        {!newHandlerSectionVisible && (
                            <MenuItem
                                title="Add new handler"
                                icon={ThemedIconName.plusSmall}
                                onClick={() => setNewHandlerSectionVisible(true)}
                            />
                        )}
                    </MenuSection>
                    {newHandlerSectionVisible && (
                        <MenuSection title={"New handler"} description={"Choose type of the new device"}>
                            {availableHandlers?.map((handler) => (
                                <MenuItem
                                    active={newHandlerType === handler.type}
                                    key={handler.type}
                                    title={handler.name}
                                    icon={handler.icon}
                                    onClick={() => showNewHandler(handler.type)}
                                />
                            ))}
                            <Separator variant={SeparatorVariant.menu} />
                            <MenuItem
                                title="Close"
                                icon={ThemedIconName.crossSmall}
                                onClick={() => {
                                    setNewHandlerType(null);
                                    setNewHandlerSectionVisible(false);
                                }}
                            />
                        </MenuSection>
                    )}
                </Menu>
                <FlexLayout direction="column" className="content">
                    {newHandler && <NewHandler {...newHandler} />}
                    {currentHandlerId && <Handler id={currentHandlerId} />}
                </FlexLayout>
            </FlexLayout>
        </NavbarLayout>
    );
};

export default Handlers;
