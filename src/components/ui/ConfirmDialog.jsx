"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function ConfirmDialog({
    open,
    onOpenChange,
    title = "Are you sure?",
    description = "This action cannot be undone.",
    confirmLabel = "Yes, continue",
    onConfirm,
    loading = false,
}) {
    return (
        //  h-[366.33px]
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white shadow-none dark:bg-[#171717] w-[384px] h-fit p-0 text-foreground space-y-0 gap-0 rounded-md ">
                <div>
                    <DialogHeader className='border-b  h-min flex  justify-center px-3.5'>
                        <DialogTitle className="flex py-3.5  text-lg tracking-tight leading-tight dark:text-white text-black font-semibold">
                            {title}
                            {/* Confirm deletion of kinzixinfotech@gmail.com's Project */}
                        </DialogTitle>
                    </DialogHeader>

                    <div className='border-b  dark:text-white text-black h-min flex py-3.5  justify-center px-4'>
                        {description}
                        {/* This will permanently delete the kinzixinfotech@gmail.com's Project project and all of its data. */}
                    </div>
                </div>
                <DialogFooter className="flex flex-col py-5 px-4 gap-2 sm:flex-row justify-center items-center">
                    <DialogClose asChild>
                        <Button variant="outline" className="w-full cursor-pointer  dark:text-white text-black sm:w-auto">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        className="w-full sm:w-auto bg-[#541c15] border-2 cursor-pointer  dark:text-white text-black border-[#541c15] hover:bg-[#e54d2e80] hover:border-red-600 hover:border-2 text-white"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
