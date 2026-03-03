import { useState, useEffect } from "react";

/**
 * Debounce a value by a given delay.
 * Returns the debounced value that only updates after
 * the specified delay has passed since the last change.
 *
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default 400)
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay = 400) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
