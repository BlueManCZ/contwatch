export class Dialog {
    private element: HTMLElement;

    constructor(id: string) {
        this.element = document.getElementById(id);

        this.element.firstChild.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }

    load(dialogName: string): void {
        const request = new XMLHttpRequest();
        request.open("POST", `/dialog/${dialogName}`);
        request.onload = (): void => {
            (<HTMLElement> this.element.firstChild).innerHTML = request.responseText;
            this.show();
        };
        request.send();
    }

    show(): void {
        this.element.classList.remove("dialog-hidden");
    }

    send(url:string): void {
        const request = new XMLHttpRequest();
        const data = new FormData(this.form());
        request.onload = (): void => {
            this.hide();
        };
        request.open("POST", url);
        request.send(data);
    }

    hide(): void {
        this.element.classList.add("dialog-hidden");
    }

    form(): HTMLFormElement {
        return this.element.querySelector("form");
    }
}
