// src/LoadingProvider.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
	isLoading: boolean;
	showLoading: () => void;
	hideLoading: () => void;
}

// Create context with an initial undefined value
const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Custom hook with type safety
export const useLoading = (): LoadingContextType => {
	const context = useContext(LoadingContext);
	if (context === undefined) {
		throw new Error('useLoading must be used within a LoadingProvider');
	}
	return context;
};

interface LoadingProviderProps {
	children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const showLoading = (): void => setIsLoading(true);
	const hideLoading = (): void => setIsLoading(false);

	const value: LoadingContextType = {
		isLoading,
		showLoading,
		hideLoading,
	};

	return (
		<LoadingContext.Provider value={value}>
			{children}
			{isLoading && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white p-5 rounded-lg shadow-lg">
						<div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
						<p className="mt-4 text-gray-700">Loading...</p>
					</div>
				</div>
			)}
		</LoadingContext.Provider>
	);
};