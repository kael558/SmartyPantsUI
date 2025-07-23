import { createContext, useContext } from "react";
import { useAuth } from "../services/AuthProvider";

const businessApiUrl = process.env.REACT_APP_BUSINESS_API_URL + "/api/v1";
const streamApiUrl = process.env.REACT_APP_STREAM_API_URL;
const chatApiUrl = process.env.REACT_APP_CHAT_API_URL + "/api/v1";
const restApiUrl = process.env.REACT_APP_REST_API_URL + "/api/v1";

interface QueryResponse {
	query: string;
	results: {
		score: number;
		content: string;
		header: string;
		sourceUrl: string;
		timestamp: string;
	}[];
}

interface PaginatedDataResponse {
	data: {
		id: string;
		content: string;
		header: string;
		sourceUrl: string;
		timestamp: string;
	}[];
	pagination: {
		nextPage: string;
		hasMore: boolean;
	};
}

interface BusinessContextType {}

const BusinessContext = createContext<BusinessContextType | undefined>(
	undefined
);

interface BusinessProviderProps {
	children: React.ReactNode;
}

export const BusinessProvider: React.FC<BusinessProviderProps> = ({
	children,
}) => {
	const { getAccessToken } = useAuth();

	const fetchWrapper = async (url: string, options: any) => {
		const response = await fetch(url, {
			...options,
			headers: {
				...options.headers,
				Authorization: `Bearer ${await getAccessToken()}`,
			},
		});
		if (response.ok) {
			if (response.status === 204) {
				return null;
			}
			return response.json();
		} else if (response.status === 429) {
			// Handle 429 error specifically
			throw new Error("Quota exceeded. Please try again later."); // Custom error message
		} else {
			throw new Error(response.statusText);
		}
	};

	const contextValue = {};

	return (
		<BusinessContext.Provider value={contextValue}>
			{children}
		</BusinessContext.Provider>
	);
};

export const useBusinessAPI = (): BusinessContextType => {
	const context = useContext(BusinessContext);
	if (context === undefined) {
		throw new Error("useBusinessAPI must be used within a BusinessProvider");
	}
	return context;
};
