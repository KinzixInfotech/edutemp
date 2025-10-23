"use client"

import React, { createContext, useContext, useState } from "react"
import CommandMenu from "./commandmenu"

// import CommandMenu from "@/components/CommandMenu" // path to your existing CommandMenu

const CommandMenuContext = createContext({
    open: false,
    setOpen: () => { },
})

export const CommandMenuProvider = ({ children }) => {
    const [open, setOpen] = useState(false)

    return (
        <CommandMenuContext.Provider value={{ open, setOpen }}>
            {children}
            <CommandMenu open={open} setOpen={setOpen} />
            {/* <CommandMenu open={open} setOpen={setOpen} /> */}
        </CommandMenuContext.Provider>
    )
}

export const useCommandMenu = () => useContext(CommandMenuContext)
