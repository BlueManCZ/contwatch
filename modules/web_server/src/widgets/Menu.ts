import { Page } from "./Page";
import { addModifier, removeModifier } from "../utils/ElementTools";

export class Menu {
    private element: HTMLElement;
    private readonly _page: Page;
    private buttons: HTMLCollectionOf<Element>;

    constructor(id: string, colors: string[]) {
        this.element = document.getElementById(id);
        this._page = new Page("content-container", colors);
        this.buttons = document.getElementsByClassName("navbar-item");

        this.bindEventListeners();
    }

    get page(): Page {
        return this._page;
    }

    bindEventListeners(): void {
        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].addEventListener("click", (event) => {
                this.click(<HTMLElement> event.currentTarget);
            });
        }
    }

    buttonFocus(button: HTMLElement): void {
        addModifier(button, "active");
    }

    selectPage(name: string, callback: () => void = () => { /* */ }): void {
        const button = document.getElementById(`menu-item-${name}`);
        this.click(button, callback);
    }

    click(button: HTMLElement, callback: () => void = () => { /* */ }): void {
        if (window.innerWidth < 900) {
            (window as any).app.loader.show();
        }
        const pageName = button.id.split("-")[2];
        this.page.load(pageName, callback);
        this.scrollUp();
        this.page.scrollUp();
        this.hide();

        for (let i = 0; i < this.buttons.length; i++) {
            removeModifier(<HTMLElement> this.buttons[i], "active");
        }

        this.buttonFocus(button);
    }

    hide(): void {
        this.element.classList.remove("visible");
    }

    show(): void {
        this.element.classList.add("visible");
    }

    scrollUp(): void {
        this.element.scrollTo(0, 0);
    }
}
