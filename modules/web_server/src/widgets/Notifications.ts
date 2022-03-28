export class Notifications {
    private element: HTMLElement;
    private notifications: HTMLElement;
    private button: HTMLElement;

    constructor(id: string) {
        this.element = document.getElementById(`${id}-wrapper`);
        this.notifications = document.getElementById(`${id}`);
        this.button = document.getElementById("notifications-button");
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
        this.element.classList.add("visible");
    }

    hide(): void {
        this.element.classList.remove("visible");
    }

    addNotification(titleText: string, messageText: string, type: string): void {
        const notif = document.createElement("div");
        notif.classList.add("notification");
        notif.classList.add(type);
        notif.classList.add("active");

        const icon = document.createElement("div");

        const title = document.createElement("h3");
        title.innerHTML = titleText;

        const message = document.createElement("p");
        message.innerHTML = messageText;

        const close = document.createElement("span");
        close.addEventListener("click", () => {
            this.closeNotification(notif);
        });

        notif.appendChild(icon);
        notif.appendChild(title);
        notif.appendChild(message);
        notif.appendChild(close);

        this.notifications.prepend(notif);

        setTimeout(() => {
            notif.classList.remove("active");
        }, 3000);

        this.updateNotificationCount();
    }

    closeNotification(notification: HTMLElement): void {
        notification.classList.add("removed");
        notification.classList.remove("active");
        setTimeout(() => {
            notification.remove();
            this.updateNotificationCount();
        }, 300);
    }

    updateNotificationCount(): void {
        const count = this.notifications.childElementCount;
        this.button.innerHTML = count ? `${count}` : "";

        if (count > 0) {
            this.button.classList.add("active");
        } else {
            this.button.classList.remove("active");
            this.hide();
        }
    }
}
