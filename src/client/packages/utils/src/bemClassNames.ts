export const bemClassNames = (classNamesMap: { [key: string]: string }, target?: string) => {
    return (
        classNameOrModifiers: string | number | Record<string, string | number | boolean | undefined> = "",
        modifiers: Record<string, string | number | boolean | undefined> = {},
    ) => {
        let blockClassName = "";
        if (typeof classNameOrModifiers === "object") {
            // biome-ignore lint/style/noParameterAssign:
            modifiers = classNameOrModifiers;
        } else if (typeof classNameOrModifiers === "number") {
            blockClassName = classNameOrModifiers.toString();
        } else {
            blockClassName = classNameOrModifiers;
        }
        let baseClass = target ? target : Object.keys(classNamesMap)[0];
        if (!baseClass) {
            return "";
        }
        if (blockClassName) {
            baseClass += `__${blockClassName}`;
        }
        let resultClassNames = classNamesMap[baseClass];
        for (const modifier of Object.keys(modifiers)) {
            const key = modifier as keyof typeof modifiers;
            if (modifiers[key] === undefined || modifiers[key] === null || modifiers[key] === false) {
                continue;
            }
            let newClassName = "";
            if (typeof modifiers[key] === "boolean") {
                if (modifiers[key] as unknown as boolean) {
                    newClassName = classNamesMap[`${baseClass}--${modifier}`] ?? "";
                }
            } else if (["string", "number"].includes(typeof modifiers[key])) {
                newClassName = classNamesMap[`${baseClass}--${modifier}-${modifiers[key]}`] ?? "";
            } else {
                newClassName = classNamesMap[`${baseClass}--${modifier}`] ?? "";
            }
            if (newClassName) {
                resultClassNames += ` ${newClassName}`;
            }
        }
        return resultClassNames;
    };
};
