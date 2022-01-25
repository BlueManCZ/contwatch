import { Menu } from "./widgets/Menu";
import { Dialog } from "./widgets/Dialog";
import { Inspector } from "./Inspector";
import { GifLoader } from "./widgets/GifLoader";

export class Application {
    private readonly colors: string[]
    private sockets: any // Js class
    private loader: GifLoader;
    private menu: Menu
    private dialog: Dialog
    private inspector: Inspector

    constructor() {
        // @ts-ignore
        // eslint-disable-next-line no-undef
        this.sockets = io();
        this.colors = ["#7233ff", "#299bec", "#65c44c", "#fd8f64", "#ffcd41"];

        this.loader = new GifLoader();
        this.loader.gifSrc = "static/GifLoader.js/src/images/hex-loader.gif";
        this.loader.show();

        this.menu = new Menu("menu", this.colors);
        this.dialog = new Dialog("dialog-container");
        this.inspector = new Inspector("inspector-chart-view", this.colors);

        this.bindSockets();
    }

    bindSockets(): void {
        this.sockets.on("content-change-notification", (pageName: string) => {
            if (this.menu.page.currentPage === pageName) {
                this.menu.page.refresh();
            }
        });
    }
}
