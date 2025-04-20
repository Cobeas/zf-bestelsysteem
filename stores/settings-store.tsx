"use client";

import { create } from "zustand";

type SettingsStore = {
    name?: string;
    live: boolean;
    id: number;
    setSettings: (settings: {
        name: string;
        user_password: string;
        admin_password: string;
        live: boolean;
        id: number
    }) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
    name: "",
    live: false,
    id: 0,
    setSettings: (settings) => set(() => ({ ...settings })),
}));