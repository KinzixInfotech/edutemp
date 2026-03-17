// hooks/useDebounceValue.js
import { useState, useEffect } from "react";

/**
 * Returns a debounced copy of `value` that only updates after
 * `delay` ms of silence. Drop-in replacement for the raw value
 * in query keys so rapid typing doesn't fire a server request
 * on every keystroke.
 *
 * Usage:
 *   const searchTerm = useDebounceValue(searchInput, 350);
 */
export default function useDebounceValue(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cancel the previous timer if value or delay changes before it fires
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}