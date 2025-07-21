import { createContext, useContext } from "react";
import { useAuth } from "../auth/AuthProvider";

const businessApiUrl =
	(import.meta as any).env.VITE_BUSINESS_API_URL + "/api/v1";
const streamApiUrl = (import.meta as any).env.VITE_STREAM_API_URL;
const chatApiUrl = (import.meta as any).env.VITE_CHAT_API_URL + "/api/v1";
const restApiUrl = (import.meta as any).env.VITE_REST_API_URL + "/api/v1";

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

interface BusinessContextType {
	testWebhook: (
		projectId: string,
		leadInfo: any,
		webhookUrl: string
	) => Promise<any>;
	testDomain: (domain: string) => Promise<any>;

	createProject: (projectData: any) => Promise<any>;
	getProjectById: (projectId: string) => Promise<any>;
	getProjectsByOwner: () => Promise<any>;
	getProjectsSharedWithYou: () => Promise<any>;
	shareProject: (projectId: string, userEmail: string) => Promise<any>;
	deleteProject: (projectId: string) => Promise<any>;
	saveProject: (projectId: string, projectData: any) => Promise<any>;
	updateProject: (projectId: string, projectData: any) => Promise<any>;

	uploadIcon: (projectId: string, file: File) => Promise<any>;

	startCrawl: (projectId: string, crawlOptions: CrawlOptions) => Promise<any>;
	checkCrawlStatus: (projectId: string, crawlId: string) => Promise<any>;
	deleteCrawl: (projectId: string, crawlId: string) => Promise<any>;
	getColorSchemes: (
		projectId: string,
		crawlId: string,
		force?: boolean
	) => Promise<any>;

	uploadFile: (projectId: string, file: File) => Promise<any>;
	checkFileStatus: (projectId: string, fileId: string) => Promise<any>;
	deleteFile: (projectId: string, fileId: string) => Promise<any>;

	editProjectData: (projectId: string, dataItem: any) => Promise<any>;
	fetchProjectData: (
		projectId: string,
		page: string | undefined
	) => Promise<PaginatedDataResponse>;
	queryProjectData: (
		projectId: string,
		query: string,
		limit?: number
	) => Promise<QueryResponse>;
	deleteProjectData: (projectId: string, dataId: string) => Promise<any>;

	checkIFrame: (domainUrl: string) => Promise<any>;
	deploy: (projectId: string, chatStyles: any) => Promise<any>;
	chat: (
		projectId: string,
		sessionId: string,
		messages: any,
		website_url: string,
		custom_instructions: string | null,
		response_style: string | null,
		businessInfo: any
	) => Promise<any>;
	submitIssue: (
		projectId: string,
		issue: any,
		messages: any,
		email: string
	) => Promise<any>;
	sendVerificationCode: (projectId: string, email: string) => Promise<any>;
	verifyEmail: (
		projectId: string,
		email: string,
		code: string
	) => Promise<any>;

	addFeedback: (
		projectId: string,
		messages: any,
		feedback: any
	) => Promise<any>;
	deleteFeedback: (projectId: string, feedbackId: string) => Promise<any>;
	getFeedback: (
		projectId: string,
		feedback: "like" | "dislike" | "all",
		lastEvaluatedKey?: string,
		n?: number
	) => Promise<any>;

	getLeads: (projectId: string) => Promise<any>;

	exportLeads: (projectId: string) => Promise<any>;
	getUsage: (projectId: string) => Promise<any>;

	createPortalSession: () => Promise<any>;
	subscribe: (lookup_key: string) => Promise<any>;
	addPaymentMethod: () => Promise<any>;
	cancelSubscription: () => Promise<any>;
}

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

	const testDomain = async (domain: string) => {
		return fetchWrapper(`${restApiUrl}/test-domain`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ domain }),
		});
	};

	// Create a new project
	const createProject = async (projectData: any) => {
		return fetchWrapper(`${businessApiUrl}/projects`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(projectData),
		});
	};

	// Get projects by owner
	const getProjectsByOwner = async () => {
		return fetchWrapper(`${businessApiUrl}/projects/owner`, {
			method: "GET",
		});
	};

	// Get projects shared with the user
	const getProjectsSharedWithYou = async () => {
		return fetchWrapper(`${businessApiUrl}/projects/shared`, {
			method: "GET",
		});
	};

	/* Project Data API */
	const deleteProject = async (projectId: string) => {
		return fetchWrapper(`${businessApiUrl}/projects/${projectId}`, {
			method: "DELETE",
		});
	};

	// Share a project
	const shareProject = async (projectId: string, userEmail: string) => {
		return fetchWrapper(`${businessApiUrl}/projects/${projectId}/share`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ userEmail }),
		});
	};

	const saveProject = async (projectId: string, projectData: any) => {
		return fetchWrapper(`${businessApiUrl}/projects/${projectId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(projectData),
		});
	};

	// Get a project by ID
	const getProjectById = async (projectId: string) => {
		return fetchWrapper(`${businessApiUrl}/projects/${projectId}`, {
			method: "GET",
		});
	};

	const updateProject = async (projectId: string, projectData: any) => {
		return fetchWrapper(`${businessApiUrl}/projects/${projectId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(projectData),
		});
	};

	const uploadIcon = async (projectId: string, file: File) => {
		const formData = new FormData();
		formData.append("icon", file);

		return fetchWrapper(`${businessApiUrl}/projects/${projectId}/icon`, {
			method: "POST",
			body: formData,
		});
	};

	const startCrawl = async (
		projectId: string,
		crawlOptions: CrawlOptions
	) => {
		return fetchWrapper(`${businessApiUrl}/start-crawl/${projectId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ crawlOptions }),
		});
	};

	const checkCrawlStatus = async (projectId: string, crawlId: string) => {
		return fetchWrapper(
			`${businessApiUrl}/check-status/${projectId}/${crawlId}`,
			{
				method: "GET",
			}
		);
	};

	const deleteCrawl = async (projectId: string, crawlId: string) => {
		return fetchWrapper(
			`${businessApiUrl}/delete-crawl/${projectId}?crawlId=${crawlId}`,
			{
				method: "DELETE",
			}
		);
	};

	const getColorSchemes = async (
		projectId: string,
		crawlId: string,
		force: boolean = false
	) => {
		return fetchWrapper(
			`${restApiUrl}/take-screenshot/${projectId}/${crawlId}?force=${force}`,
			{
				method: "GET",
			}
		);
	};

	const uploadFile = async (projectId: string, file: File) => {
		const formData = new FormData();
		formData.append("file", file);

		return fetchWrapper(`${businessApiUrl}/projects/${projectId}/upload`, {
			method: "POST",
			body: formData,
		});
	};

	const checkFileStatus = async (projectId: string, fileId: string) => {
		return fetchWrapper(
			`${businessApiUrl}/projects/${projectId}/file-status/${fileId}`,
			{
				method: "GET",
			}
		);
	};

	const deleteFile = async (projectId: string, fileId: string) => {
		return fetchWrapper(
			`${businessApiUrl}/projects/${projectId}/delete-file/${fileId}`,
			{
				method: "DELETE",
			}
		);
	};

	const checkIFrame = async (domainUrl: string) => {
		return fetchWrapper(
			`${businessApiUrl}/api/check-iframe?url=${encodeURIComponent(
				domainUrl
			)}`,
			{
				method: "GET",
			}
		);
	};

	const fetchProjectData = async (
		projectId: string,
		page: string | undefined
	) => {
		return fetchWrapper(
			`${businessApiUrl}/projects/${projectId}/data/${page}`,
			{
				method: "GET",
			}
		);
	};

	const editProjectData = async (projectId: string, dataItem: any) => {
		return fetchWrapper(`${businessApiUrl}/projects/${projectId}/data`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(dataItem),
		});
	};

	// In your API utilities file
	const deleteProjectData = async (projectId: string, dataId: string) => {
		const encodedDataId = encodeURIComponent(dataId);

		const response = await fetchWrapper(
			`${businessApiUrl}/projects/${projectId}/data?id=${encodedDataId}`,
			{
				method: "DELETE",
			}
		);
		if (!response.ok) {
			throw new Error("Failed to delete data");
		}
		return await response.json();
	};

	const queryProjectData = async (
		projectId: string,
		query: string,
		limit?: number
	) => {
		return fetchWrapper(`${businessApiUrl}/projects/${projectId}/query`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ query, limit }),
		});
	};

	const deploy = async (projectId: string) => {
		return fetchWrapper(`${businessApiUrl}/deploy/${projectId}`, {
			method: "GET",
		});
	};

	const chat = async (
		projectId: string,
		sessionId: string,
		messages: any,
		website_url: string,
		custom_instructions: string | null,
		response_style: string | null,
		businessInfo: any
	) => {
		const body = {
			messages,
			website_url,
			custom_instructions,
			response_style,
			businessInfo,
		} as any;

		// check if localhost
		body.debug = window.location.hostname === "localhost" ? true : false;

		const response = await fetch(`${chatApiUrl}/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-project-id": projectId,
				"x-session-id": sessionId,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			console.error(response.statusText);
			// Create a more detailed error object
			const errorData = await response.json().catch(() => ({}));
			const error = new Error(response.statusText);
			// Add additional properties to the error
			(error as any).status = response.status;
			(error as any).data = errorData;
			throw error;
		}

		const data = await response.json();

		return data;
	};

	const submitIssue = async (
		projectId: string,
		issue: any,
		messages: any,
		email: string
	) => {
		return await fetchWrapper(`${chatApiUrl}/issue/${projectId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ issue, messages, email }),
		});
	};

	const sendVerificationCode = async (projectId: string, email: string) => {
		return fetchWrapper(
			`${businessApiUrl}/send-verification-email/${projectId}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email }),
			}
		);
	};

	const verifyEmail = async (
		projectId: string,
		email: string,
		code: string
	) => {
		return fetchWrapper(`${businessApiUrl}/verify-email/${projectId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email, code }),
		});
	};

	const getUsage = async (projectId: string) => {
		return fetchWrapper(`${chatApiUrl}/usage/${projectId}`, {
			method: "GET",
		});
	};

	const addFeedback = async (
		projectId: string,
		messages: any,
		feedback: any
	) => {
		return fetch(`${chatApiUrl}/feedback/${projectId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ messages, feedback }),
		});
	};

	const deleteFeedback = async (projectId: string, feedbackId: string) => {
		// encode
		feedbackId = encodeURIComponent(feedbackId);

		return fetchWrapper(
			`${chatApiUrl}/feedback/${projectId}?feedbackId=${feedbackId}`,
			{
				method: "DELETE",
			}
		);
	};

	const getFeedback = async (
		projectId: string,
		feedback = "all",
		lastEvaluatedKey: any = null,
		n = 10
	) => {
		const params = new URLSearchParams({
			feedback,
			n: n.toString(),
		});

		if (lastEvaluatedKey) {
			params.append("lastEvaluatedKey", JSON.stringify(lastEvaluatedKey));
		}

		const response = await fetchWrapper(
			`${chatApiUrl}/feedback/${encodeURIComponent(projectId)}?${params}`,
			{
				method: "GET",
				headers: {
					Accept: "application/json",
				},
			}
		);

		return response;
	};

	/* LEADS HANDLERS */
	const getLeads = async (projectId: string) => {
		return fetchWrapper(`${businessApiUrl}/leads/${projectId}`, {
			method: "GET",
		});
	};

	const exportLeads = async (projectId: string) => {
		return fetchWrapper(`${businessApiUrl}/leads/${projectId}/export`, {
			method: "GET",
		});
	};

	const testWebhook = async (
		projectId: string,
		leadInfo: any,
		webhookUrl: string
	) => {
		return fetchWrapper(`${businessApiUrl}/leads/${projectId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ leadInfo, webhookUrl }),
		});
	};

	/* STRIPE HANDLERS */
	const subscribe = async (lookup_key: string) => {
		return fetchWrapper(`${businessApiUrl}/subscribe`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				lookup_key: lookup_key,
			}),
		});
	};

	const cancelSubscription = async () => {
		return fetchWrapper(`${businessApiUrl}/cancel-subscription`, {
			method: "POST",
		});
	};

	const addPaymentMethod = async () => {
		return fetchWrapper(`${businessApiUrl}/add-payment-method`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});
	};

	const createPortalSession = async () => {
		return fetchWrapper(`${businessApiUrl}/create-portal-session`, {
			method: "POST",
		});
	};

	const contextValue = {
		testDomain,

		createProject,
		getProjectById,
		getProjectsByOwner,
		getProjectsSharedWithYou,
		shareProject,
		deleteProject,
		saveProject,
		updateProject,
		uploadIcon,

		startCrawl,
		checkCrawlStatus,
		deleteCrawl,
		getColorSchemes,

		uploadFile,
		checkFileStatus,
		deleteFile,

		editProjectData,
		fetchProjectData,
		queryProjectData,
		deleteProjectData,

		deploy,
		chat,
		submitIssue,
		checkIFrame,

		sendVerificationCode,
		verifyEmail,

		getUsage,
		addFeedback,
		deleteFeedback,
		getFeedback,

		getLeads,
		exportLeads,
		testWebhook,

		subscribe,
		cancelSubscription,
		addPaymentMethod,
		createPortalSession,
	};

	return (
		<BusinessContext.Provider value={contextValue}>
			{children}
		</BusinessContext.Provider>
	);
};

export const useBusinessAPI = (): BusinessContextType => {
	const context = useContext(BusinessContext);
	if (context === undefined) {
		throw new Error(
			"useBusinessAPI must be used within a BusinessProvider"
		);
	}
	return context;
};
