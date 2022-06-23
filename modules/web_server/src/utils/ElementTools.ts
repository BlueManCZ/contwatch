export function addModifier(element: HTMLElement, modifier: string): HTMLElement {
    const className = element.classList[0];
    element.classList.add(`${className}--${modifier}`);
    return element;
}

export function removeModifier(element: HTMLElement, modifier: string): HTMLElement {
    const className = element.classList[0];
    element.classList.remove(`${className}--${modifier}`);
    return element;
}
