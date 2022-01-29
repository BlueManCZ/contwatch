export function dateISO(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function dateISOString(dateString?: string): string {
    let date = new Date();

    if (typeof dateString !== "undefined") {
        date = new Date(dateString);
    }

    return dateISO(date);
}

export function dateDaysOffset(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
