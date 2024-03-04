import { KeyboardEventHandler, MouseEventHandler, WheelEventHandler } from "react";

export interface Household {
    id: number;
    name: string;
}

export interface User {
    id: number;
    email: string;
    name: string;
    logged_in: boolean;
    households: Household[];
}

export type InteractiveProps = {
    onClick?: MouseEventHandler;
    onWheel?: WheelEventHandler;
    onMouseDown?: MouseEventHandler;
    onMouseUp?: MouseEventHandler;
    onMouseEnter?: MouseEventHandler;
    onMouseLeave?: MouseEventHandler;
    onKeyDown?: KeyboardEventHandler;
};

export interface Category {
    id: number;
    name: string;
    iconName: string;
}

export interface Product {
    id: number;
    name: string;
    category: Category;
    lastPrice?: number;
}

export interface Vendor {
    id: number;
    name: string;
    description: string;
}

export enum Key {
    "ArrowUp" = "ArrowUp",
    "ArrowDown" = "ArrowDown",
    "Enter" = "Enter",
}

export type ExpenseItem = {
    id: number;
    product: Product;
    amount: number;
    price: number;
    added: Date;
    sharedWith?: Household | null;
};

export type Expense = {
    id: number;
    vendor: Vendor;
    items: ExpenseItem[];
    date: number;
    userId?: number;
};
