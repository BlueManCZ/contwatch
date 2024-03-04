import { HandlerStatus } from "./HandlerModel";

export const getStatusColor = (handlerStatus: HandlerStatus = HandlerStatus.DISCONNECTED) => {
    const colors = ["red", "green", "gray"];
    return colors[handlerStatus];
};

export const getStatusText = (handlerStatus: HandlerStatus = HandlerStatus.DISCONNECTED) => {
    const texts = ["disconnected", "connected", "disabled"];
    return texts[handlerStatus];
};
