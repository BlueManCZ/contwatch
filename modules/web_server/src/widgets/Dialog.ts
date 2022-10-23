import { post } from "../utils/URLTools";
import { addModifier, removeModifier } from "../utils/ElementTools";

export class Dialog {
    private readonly element: HTMLElement;
    private readonly dialog: HTMLElement;

    constructor(id: string) {
        this.element = document.getElementById(id);
        this.dialog = this.element.getElementsByTagName("dialog")[0];

        this.dialog.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }

    load(dialogName: string, data: Record<string, string> = {}): void {
        post(`/dialog/${dialogName}`, (request) => {
            this.dialog.innerHTML = request.responseText;
            this.show();
        }, data, "JSON");
    }

    show(): void {
        this.dialog.scrollTo(0, 0);
        removeModifier(this.element, "hidden");
    }

    send(url:string): void {
        post(url, (request) => {
            this.hide();
            const json = JSON.parse(request.response);
            if (json.status === "error") {
                (window as any).app.notifications.addNotification(json.title ? json.title : "Error", json.message, "error");
            }
        }, new FormData(this.form()));
    }

    hide(): void {
        addModifier(this.element, "hidden");
    }

    form(): HTMLFormElement {
        return this.element.querySelector("form");
    }
}
