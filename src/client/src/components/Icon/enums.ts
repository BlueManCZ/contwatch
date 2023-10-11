export const getIcon = (icon: IconName, theme: string = "cosmic") => {
    if (Object.values(CustomIconName).includes(icon as CustomIconName)) {
        return `/icons/custom/${icon}.png`;
    }
    return `/icons/${theme}/${icon}.svg`;
};

export enum ThemedIconName {
    air = "air",
    arrowCircleLeft = "arrow-circle-left",
    arrowCircleRight = "arrow-circle-right",
    arrowLeft = "arrow-left",
    arrowRight = "arrow-right",
    basket = "basket",
    batteryMedium = "battery-medium",
    box = "cart-3",
    branchHorizontal = "branch-horizontal",
    calendar = "calendar",
    cam = "cam",
    capsule = "capsule",
    cart = "cart-4",
    cast = "cast",
    chartSquare = "chart-square",
    cloud = "cloud",
    coin = "coin",
    copy = "copy",
    cross = "cross",
    crossSmall = "cross-small",
    globe = "globe-1",
    gridMixed = "grid-mixed",
    headphones = "headphones",
    home = "home-1",
    laptop = "laptop",
    location = "location-2",
    logout = "logout",
    music = "music",
    plus = "plus",
    plusSmall = "plus-small",
    plusCircle = "plus-circle",
    power = "power",
    print = "print",
    processor = "processor",
    settings = "settings",
    sun = "sun",
    smartphone = "smartphone",
    user = "user-1",
    wallet = "wallet",
}

export enum CustomIconName {
    http = "http",
    logo = "logo",
}

export type IconName = ThemedIconName | CustomIconName;
