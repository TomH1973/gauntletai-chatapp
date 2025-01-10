import { useState, useEffect } from 'react';

/**
 * @hook useDebounce
 * @description Custom hook that debounces a value by delaying updates
 * 
 * @template T - Type of the value to debounce
 * @param {T} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {T} The debounced value
 * 
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 500);
 * 
 * // debouncedSearch will update 500ms after the last change to search
 * useEffect(() => {
 *   performSearch(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
} 