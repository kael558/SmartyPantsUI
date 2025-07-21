import { useState, useEffect } from "react";

export function useLocalStorage(
	key: string,
	initialValue: any
) {
	const [storedValue, setStoredValue] = useState(() => {
		try {
			const item = localStorage.getItem(key);
			return item ? JSON.parse(item) : initialValue;
		} catch (error) {
			console.error(error);
			return initialValue;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(key, JSON.stringify(storedValue));
		} catch (error) {
			console.error(error);
		}
	}, [key, storedValue]);

	const setValue = (value: any) => {
		try {
			const valueToStore =
				value instanceof Function ? value(storedValue) : value;
			setStoredValue(valueToStore);
		} catch (error) {
			console.error(error);
		}
	};

	return [storedValue, setValue];
}
