export class GifLoader {
    private _autoHide: boolean;
    private readonly _element: HTMLElement;
    private readonly _gifElement: HTMLImageElement;

    get autoHide(): boolean {
        return this._autoHide;
    }

    set autoHide(state: boolean) {
        this._autoHide = state;
    }

    get gifSrc(): string {
        return this._gifElement.src;
    }

    set gifSrc(src: string) {
        this._gifElement.src = src;
    }

    constructor() {
        this.autoHide = true;

        this._element = document.createElement("div");
        this._element.id = "loader";
        this._element.classList.add("loader_hidden");

        this._gifElement = document.createElement("img");
        this.gifSrc = "src/images/hex-loader.gif";
        this._gifElement.alt = "Loading...";

        this._element.appendChild(this._gifElement);
        document.body.appendChild(this._element);
        document.body.classList.add("preload");

        window.addEventListener("load", () => {
            this._doAutoHide();
        });
    }

    show(): void {
        document.body.classList.add("preload");
        this._element.classList.remove("loader_hidden");
    }

    hide(): void {
        document.body.classList.remove("preload");
        this._element.classList.add("loader_hidden");
    }

    _doAutoHide(): void {
        if (this.autoHide) {
            this.hide();
        }
    }
}
