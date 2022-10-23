export function addModifier(element: HTMLElement, modifier: string): HTMLElement {
    const className = element.classList[0];
    const newClass = `${className}--${modifier}`;
    if (!element.classList.contains(newClass)) {
        element.classList.add(newClass);
    }
    return element;
}

export function removeModifier(element: HTMLElement, modifier: string): HTMLElement {
    const className = element.classList[0];
    element.classList.remove(`${className}--${modifier}`);
    return element;
}
