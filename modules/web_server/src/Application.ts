import { Menu } from "./widgets/Menu";
import { Notifications } from "./widgets/Notifications";
import { Dialog } from "./widgets/Dialog";
import { Inspector } from "./Inspector";
import { GifLoader } from "./widgets/GifLoader";
import { Actions } from "./Actions";
import { del } from "./utils/URLTools";

export class Application {
    private readonly colors: string[];
    private sockets: any; // Js class
    private loader: GifLoader;
    private menu: Menu;
    private notifications: Notifications;
    private dialog: Dialog;
    private inspector: Inspector;
    private actions: Actions;
    private connection = true;

    constructor() {
        // @ts-ignore
        // eslint-disable-next-line no-undef
        this.sockets = io();
        this.colors = ["#7233ff", "#299bec", "#65c44c", "#fd8f64", "#ffcd41"];

        this.loader = new GifLoader();
        this.loader.gifSrc = "static/GifLoader.js/src/images/hex-loader.gif";
        this.loader.show();

        this.menu = new Menu("menu", this.colors);
        this.notifications = new Notifications("notifications");
        this.dialog = new Dialog("dialog-container");
        this.inspector = new Inspector("inspector-chart-view", this.colors);
        this.actions = new Actions();

        this.bindSockets();
    }

    bindSockets(): void {
        this.sockets.on("content-change-notification", (pageName: string) => {
            if (this.menu.page.currentPage === pageName) {
                this.menu.page.refresh();
            }
        });

        // this.sockets.on("gui-notification", (payload: Record<string, string>) => {
        //     console.log(payload);
        //     (window as any).app.notifications.addNotification(payload.title, payload.message, payload.status);
        // });

        this.sockets.on("connect", () => {
            if (!this.connection) {
                (window as any).app.notifications.addNotification(
                    "Server connected",
                    "Reconnected to the server",
                    "success");
            }
            this.connection = true;
        });

        this.sockets.on("disconnect", () => {
            (window as any).app.notifications.addNotification(
                "Server disconnected",
                "Lost connection to the server",
                "warning");
            this.connection = false;
        });
    }

    deleteAllTables(): void {
        if (!confirm("All settings and data will be permanently deleted. Continue?")) {
            return;
        }

        del("/delete_all_tables", () => { /* */ });
    }
}
