import { HandlerStatus } from "./HandlerModel";

export const getStatusColor = (handlerStatus: HandlerStatus = HandlerStatus.DISCONNECTED) => {
    const colors = ["red", "green", "orange", "gray"];
    return colors[handlerStatus];
};

export const getStatusText = (handlerStatus: HandlerStatus = HandlerStatus.DISCONNECTED) => {
    const texts = ["disconnected", "connected", "not communicating", "disabled"];
    return texts[handlerStatus];
};
