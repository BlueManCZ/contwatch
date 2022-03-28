import { post } from "../utils/URLTools";

export class Dialog {
    private element: HTMLElement;

    constructor(id: string) {
        this.element = document.getElementById(id);

        this.element.firstChild.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }

    load(dialogName: string, data: Record<string, string> = {}): void {
        post(`/dialog/${dialogName}`, (request) => {
            (<HTMLElement> this.element.firstChild).innerHTML = request.responseText;
            this.show();
        }, data, "JSON");
    }

    show(): void {
        this.element.classList.remove("dialog-hidden");
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
        this.element.classList.add("dialog-hidden");
    }

    form(): HTMLFormElement {
        return this.element.querySelector("form");
    }
}
