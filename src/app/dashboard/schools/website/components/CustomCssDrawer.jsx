import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-css';
import 'prismjs/themes/prism.css'; // You might need to import a theme or define styles

export function CustomCssDrawer({ open, onOpenChange, css, onChange, title }) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
                <SheetHeader>
                    <SheetTitle>{title || 'Custom CSS'}</SheetTitle>
                    <SheetDescription>
                        Add custom styles for this section. Use <code>&</code> to target the section container.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex-1 mt-4 border rounded-md overflow-hidden bg-slate-950 text-slate-50 font-mono text-sm">
                    <Editor
                        value={css || ''}
                        onValueChange={onChange}
                        highlight={code => highlight(code, languages.css)}
                        padding={10}
                        style={{
                            fontFamily: '"Fira code", "Fira Mono", monospace',
                            fontSize: 12,
                            minHeight: '100%',
                        }}
                        textareaClassName="focus:outline-none"
                    />
                </div>
                <div className="mt-4 flex justify-end">
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
