import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, MoveVertical, Columns, Type, Image as ImageIcon, MousePointer, Box } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import FileUploadButton from "@/components/fileupload";
import { Textarea } from "@/components/ui/textarea";

export function LayoutEditor({ data, onChange }) {
    const rows = data.rows || [];

    const handleAddRow = () => {
        const newRow = {
            id: uuidv4(),
            columns: [{ id: uuidv4(), width: '100%', widget: null }]
        };
        onChange('rows', [...rows, newRow]);
    };

    const handleDeleteRow = (index) => {
        const newRows = [...rows];
        newRows.splice(index, 1);
        onChange('rows', newRows);
    };

    const handleUpdateRow = (index, key, value) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [key]: value };
        onChange('rows', newRows);
    };

    const handleSetColumns = (rowIndex, count) => {
        const row = rows[rowIndex];
        const currentCols = row.columns;
        let newCols = [];

        if (count === 1) {
            newCols = [{ id: uuidv4(), width: '100%', widget: currentCols[0]?.widget || null }];
        } else if (count === 2) {
            newCols = [
                { id: uuidv4(), width: '50%', widget: currentCols[0]?.widget || null },
                { id: uuidv4(), width: '50%', widget: currentCols[1]?.widget || null }
            ];
        } else if (count === 3) {
            newCols = [
                { id: uuidv4(), width: '33.33%', widget: currentCols[0]?.widget || null },
                { id: uuidv4(), width: '33.33%', widget: currentCols[1]?.widget || null },
                { id: uuidv4(), width: '33.33%', widget: currentCols[2]?.widget || null }
            ];
        } else if (count === 4) {
            newCols = [
                { id: uuidv4(), width: '25%', widget: currentCols[0]?.widget || null },
                { id: uuidv4(), width: '25%', widget: currentCols[1]?.widget || null },
                { id: uuidv4(), width: '25%', widget: currentCols[2]?.widget || null },
                { id: uuidv4(), width: '25%', widget: currentCols[3]?.widget || null }
            ];
        }

        handleUpdateRow(rowIndex, 'columns', newCols);
    };

    const handleUpdateWidget = (rowIndex, colIndex, widget) => {
        const newRows = [...rows];
        newRows[rowIndex].columns[colIndex].widget = widget;
        onChange('rows', newRows);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Layout Rows</Label>
                <Button size="sm" onClick={handleAddRow}>
                    <Plus className="h-4 w-4 mr-1" /> Add Row
                </Button>
            </div>

            <div className="space-y-4">
                {rows.map((row, rowIndex) => (
                    <Card key={row.id} className="border-dashed">
                        <CardHeader className="p-3 bg-muted/30 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                                <MoveVertical className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Row {rowIndex + 1}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={row.columns.length.toString()}
                                    onValueChange={(val) => handleSetColumns(rowIndex, parseInt(val))}
                                >
                                    <SelectTrigger className="h-7 w-24 text-xs">
                                        <SelectValue placeholder="Columns" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 Column</SelectItem>
                                        <SelectItem value="2">2 Columns</SelectItem>
                                        <SelectItem value="3">3 Columns</SelectItem>
                                        <SelectItem value="4">4 Columns</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleDeleteRow(rowIndex)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 space-y-3">
                            {row.columns.map((col, colIndex) => (
                                <div key={col.id} className="border rounded p-3 bg-background">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-muted-foreground">Column {colIndex + 1} ({col.width})</span>
                                        {!col.widget && (
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateWidget(rowIndex, colIndex, { type: 'text', content: 'Text Block' })} title="Text">
                                                    <Type className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateWidget(rowIndex, colIndex, { type: 'image', url: '' })} title="Image">
                                                    <ImageIcon className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateWidget(rowIndex, colIndex, { type: 'button', text: 'Click Me', url: '#' })} title="Button">
                                                    <MousePointer className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateWidget(rowIndex, colIndex, { type: 'spacer', height: '20px' })} title="Spacer">
                                                    <Box className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {col.widget ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold capitalize flex items-center gap-1">
                                                    {col.widget.type === 'text' && <Type className="h-3 w-3" />}
                                                    {col.widget.type === 'image' && <ImageIcon className="h-3 w-3" />}
                                                    {col.widget.type === 'button' && <MousePointer className="h-3 w-3" />}
                                                    {col.widget.type === 'spacer' && <Box className="h-3 w-3" />}
                                                    {col.widget.type} Widget
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleUpdateWidget(rowIndex, colIndex, null)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            {/* Widget Settings */}
                                            {col.widget.type === 'text' && (
                                                <Textarea
                                                    value={col.widget.content}
                                                    onChange={(e) => handleUpdateWidget(rowIndex, colIndex, { ...col.widget, content: e.target.value })}
                                                    className="text-xs min-h-[60px]"
                                                />
                                            )}
                                            {col.widget.type === 'image' && (
                                                <div className="space-y-1">
                                                    <FileUploadButton
                                                        field="Image"
                                                        onChange={(url) => handleUpdateWidget(rowIndex, colIndex, { ...col.widget, url })}
                                                    />
                                                    {col.widget.url && <img src={col.widget.url} className="h-10 w-auto rounded border" />}
                                                </div>
                                            )}
                                            {col.widget.type === 'button' && (
                                                <div className="space-y-1">
                                                    <Input
                                                        value={col.widget.text}
                                                        onChange={(e) => handleUpdateWidget(rowIndex, colIndex, { ...col.widget, text: e.target.value })}
                                                        placeholder="Button Text"
                                                        className="h-7 text-xs"
                                                    />
                                                    <Input
                                                        value={col.widget.url}
                                                        onChange={(e) => handleUpdateWidget(rowIndex, colIndex, { ...col.widget, url: e.target.value })}
                                                        placeholder="URL"
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                            )}
                                            {col.widget.type === 'spacer' && (
                                                <Input
                                                    value={col.widget.height}
                                                    onChange={(e) => handleUpdateWidget(rowIndex, colIndex, { ...col.widget, height: e.target.value })}
                                                    placeholder="Height (e.g. 20px)"
                                                    className="h-7 text-xs"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-10 border-2 border-dashed rounded flex items-center justify-center text-xs text-muted-foreground bg-muted/20">
                                            Empty Column
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
