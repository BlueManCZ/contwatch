import { addModifier, removeModifier } from "../utils/ElementTools";

export class Notifications {
    private element: HTMLElement;
    private notifications: HTMLElement;
    private button: HTMLElement;

    constructor(id: string) {
        this.element = document.getElementById(`${id}-wrapper`);
        this.notifications = document.getElementById(`${id}-items`);
        this.button = document.getElementById(`${id}-button`);
        document.addEventListener("click", () => {
            this.hide();
        });

        this.button.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        this.element.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }

    show(): void {
        addModifier(this.element, "visible");
    }

    hide(): void {
        removeModifier(this.element, "visible");
    }

    addNotification(titleText: string, messageText: string, type: string): void {
        const notif = document.createElement("div");
        const baseClass = "notification-item";
        notif.classList.add(baseClass);
        addModifier(notif, type);
        addModifier(notif, "active");

        const icon = document.createElement("div");
        icon.classList.add(`${baseClass}__icon`);
        addModifier(icon, type);

        const title = document.createElement("h3");
        title.classList.add(`${baseClass}__title`);
        title.innerHTML = titleText;

        const description = document.createElement("p");
        description.classList.add(`${baseClass}__description`);
        description.innerHTML = messageText;

        const close = document.createElement("span");
        close.classList.add(`${baseClass}__close-button`);
        close.addEventListener("click", () => {
            this.closeNotification(notif);
        });

        notif.appendChild(icon);
        notif.appendChild(title);
        notif.appendChild(description);
        notif.appendChild(close);

        this.notifications.prepend(notif);

        setTimeout(() => {
            removeModifier(notif, "active");
        }, 3000);

        this.updateNotificationCount();
    }

    closeNotification(notification: HTMLElement): void {
        addModifier(notification, "removed");
        removeModifier(notification, "active");
        setTimeout(() => {
            notification.remove();
            this.updateNotificationCount();
        }, 300);
    }

    updateNotificationCount(): void {
        const count = this.notifications.childElementCount;
        this.button.innerHTML = count ? `${count}` : "";

        if (count > 0) {
            addModifier(this.button, "active");
        } else {
            removeModifier(this.button, "active");
            this.hide();
        }
    }
}
