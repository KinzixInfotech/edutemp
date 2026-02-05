"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import {
    ListTodo,
    X,
    Minimize2,
    Plus,
    Check,
    Trash2,
    GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "admin-todo-list";
const POSITION_KEY = "admin-todo-position";

export function AdminTodoWidget({ userId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState("");
    const [filter, setFilter] = useState("all");
    const [mounted, setMounted] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const inputRef = useRef(null);

    // For portal mounting and initial position
    useEffect(() => {
        setMounted(true);
        const savedPos = localStorage.getItem(POSITION_KEY);
        if (savedPos) {
            try {
                setPosition(JSON.parse(savedPos));
            } catch {
                setPosition({ x: window.innerWidth - 380, y: window.innerHeight - 520 });
            }
        } else {
            setPosition({ x: window.innerWidth - 380, y: window.innerHeight - 520 });
        }
    }, []);

    // Load todos from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
        if (stored) {
            try {
                setTodos(JSON.parse(stored));
            } catch (e) {
                console.error("Error loading todos:", e);
            }
        }
    }, [userId]);

    // Save todos to localStorage whenever they change
    useEffect(() => {
        if (userId) {
            localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(todos));
        }
    }, [todos, userId]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isMinimized]);

    const addTodo = () => {
        if (!newTodo.trim()) return;
        const todo = {
            id: Date.now().toString(),
            text: newTodo.trim(),
            completed: false,
            createdAt: new Date().toISOString(),
        };
        setTodos(prev => [todo, ...prev]);
        setNewTodo("");
    };

    const toggleTodo = (id) => {
        setTodos(prev => prev.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    };

    const deleteTodo = (id) => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
    };

    const filteredTodos = todos.filter(todo => {
        if (filter === "pending") return !todo.completed;
        if (filter === "completed") return todo.completed;
        return true;
    });

    const pendingCount = todos.filter(t => !t.completed).length;
    const completedCount = todos.filter(t => t.completed).length;

    const handleDragStop = (e, d) => {
        const newPos = { x: d.x, y: d.y };
        setPosition(newPos);
        localStorage.setItem(POSITION_KEY, JSON.stringify(newPos));
    };

    // Minimized panel content (fixed at bottom-right)
    const MinimizedPanel = () => (
        <div className="fixed bottom-4 right-4 z-[9999] bg-background border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-foreground" />
            <span className="font-medium text-sm text-foreground">My Tasks</span>
            {pendingCount > 0 && (
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-medium">
                    {pendingCount}
                </span>
            )}
            <button
                onClick={() => setIsMinimized(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            >
                <Plus className="h-4 w-4 rotate-45" />
            </button>
            <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );

    // Expanded panel content (draggable)
    const ExpandedPanel = () => (
        <Rnd
            position={position}
            onDragStop={handleDragStop}
            dragHandleClassName="drag-handle"
            bounds="window"
            minWidth={340}
            minHeight={300}
            enableResizing={false}
            style={{ zIndex: 9999, position: 'fixed' }}
        >
            <div className="bg-background border rounded-lg shadow-lg overflow-hidden w-[340px]">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-muted border-b">
                    {/* Drag Handle - Only this part is draggable */}
                    <div className="drag-handle flex items-center gap-2 flex-1 cursor-move">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <ListTodo className="h-4 w-4 text-foreground" />
                        <span className="font-medium text-sm text-foreground">My Tasks</span>
                        {pendingCount > 0 && (
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-medium">
                                {pendingCount}
                            </span>
                        )}
                    </div>
                    {/* Buttons - Outside drag handle */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => setIsMinimized(true)}
                            className="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <Minimize2 className="h-4 w-4" />
                        </button>
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col">
                    {/* Filter Tabs */}
                    <div className="flex border-b">
                        {[
                            { key: "all", label: "All", count: todos.length },
                            { key: "pending", label: "Pending", count: pendingCount },
                            { key: "completed", label: "Done", count: completedCount },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={cn(
                                    "flex-1 px-3 py-2 text-xs font-medium transition-colors relative",
                                    filter === tab.key
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                                <span className={cn(
                                    "ml-1 px-1.5 py-0.5 rounded text-[10px]",
                                    filter === tab.key ? "bg-primary/10" : "bg-muted"
                                )}>
                                    {tab.count}
                                </span>
                                {filter === tab.key && (
                                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Add Todo Input */}
                    <div className="p-3 border-b">
                        <form
                            onSubmit={(e) => { e.preventDefault(); addTodo(); }}
                            className="flex gap-2"
                        >
                            <Input
                                ref={inputRef}
                                placeholder="Add a new task..."
                                value={newTodo}
                                onChange={(e) => setNewTodo(e.target.value)}
                                className="h-8 text-sm"
                            />
                            <Button
                                type="submit"
                                size="sm"
                                className="h-8 px-3"
                                disabled={!newTodo.trim()}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>

                    {/* Todo List */}
                    <div className="max-h-[280px] overflow-y-auto">
                        {filteredTodos.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground">
                                <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">
                                    {filter === "all"
                                        ? "No tasks yet"
                                        : filter === "pending"
                                            ? "No pending tasks"
                                            : "No completed tasks"}
                                </p>
                                <p className="text-xs mt-1 opacity-70">
                                    {filter === "all" && "Add your first task above"}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredTodos.map((todo) => (
                                    <div
                                        key={todo.id}
                                        className={cn(
                                            "group flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors",
                                            todo.completed && "bg-muted/30"
                                        )}
                                    >
                                        <button
                                            onClick={() => toggleTodo(todo.id)}
                                            className={cn(
                                                "mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                                todo.completed
                                                    ? "bg-green-500 border-green-500 text-white"
                                                    : "border-border hover:border-primary"
                                            )}
                                        >
                                            {todo.completed && <Check className="h-2.5 w-2.5" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm leading-relaxed break-words",
                                                todo.completed && "line-through text-muted-foreground"
                                            )}>
                                                {todo.text}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                {new Date(todo.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => deleteTodo(todo.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-all"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Stats */}
                    {todos.length > 0 && (
                        <div className="px-3 py-2 bg-muted/50 border-t text-xs text-muted-foreground flex justify-between">
                            <span>{completedCount} of {todos.length} completed</span>
                            {completedCount > 0 && (
                                <button
                                    onClick={() => setTodos(todos.filter(t => !t.completed))}
                                    className="text-destructive hover:underline font-medium"
                                >
                                    Clear done
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Rnd>
    );

    return (
        <>
            {/* Header Button - Always in header */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative text-muted-foreground hover:text-foreground",
                    isOpen && "text-primary bg-muted"
                )}
                title="Admin Todo List"
            >
                <ListTodo className="h-5 w-5" />
                {pendingCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                        {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                )}
            </Button>

            {/* Floating Panel - Rendered via Portal */}
            {mounted && isOpen && createPortal(
                isMinimized ? <MinimizedPanel /> : <ExpandedPanel />,
                document.body
            )}
        </>
    );
}
