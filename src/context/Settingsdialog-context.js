"use client"

import React, { createContext, useContext, useState } from "react"

const SettingsDialogContext = createContext(null)

export function SettingsDialogProvider({ children }) {
    const [open, setOpen] = useState(false)

    return (
        <SettingsDialogContext.Provider value={{ open, setOpen }}>
            {children}
        </SettingsDialogContext.Provider>
    )
}

export function useSettingsDialog() {
    return useContext(SettingsDialogContext)
}
