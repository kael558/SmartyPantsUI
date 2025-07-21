import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./auth/LoginPage";
import RegistrationPage from "./auth/RegistrationPage";
import ProjectPage from "./project/Project";
import ProjectsPage from "./projects/Projects";
import TermsAndConditions from "./app/ToC";
import PrivacyPolicy from "./app/PrivacyPolicy";
import Landing from "./app/Landing";
import AccountPage from "./app/AccountPage";
import BlogsPage from "./app/blog/BlogsPage";
import SubscriptionSuccess from "./app/Subscribed";


import CSAutomationPage from "./app/blog/CSAutomationPage";
import AIPersonalizationPage from "./app/blog/AIPersonalizationPage";
import ChatBotImplementationPage from "./app/blog/ChatbotImplementationPage";
import ChatbotROIPage from "./app/blog/ChatbotROIPage";

import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import AuthLayout from "./app/AuthLayout";
import { BusinessProvider } from "./services/BusinessProvider";
import { LoadingProvider } from "./services/LoadingProvider";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "./services/ToastProvider";
import ChatPrivacyPolicy from "./app/ChatPrivacyPolicy";
import Layout from "./app/Layout";
import { Helmet, HelmetProvider } from 'react-helmet-async';


const queryClient = new QueryClient();
const BlogRoutes: React.FC = () => {
	return (
		<Routes>
			<Route path="/" element={<BlogsPage />} />
			<Route path="/customer-service-automation" element={<CSAutomationPage />} />
			<Route path="/ai-personalization" element={<AIPersonalizationPage />} />
			<Route path="/chatbot-implementation" element={<ChatBotImplementationPage />} />
			<Route path="/chatbot-roi" element={<ChatbotROIPage />} />
		</Routes>
	);
}

const AppRoutes: React.FC = () => {
	return (
		<Routes>
			{/* Public routes first */}
			<Route element={<Layout />}>
				<Route path="/terms-and-conditions" element={<TermsAndConditions />} />
				<Route path="/privacy-policy" element={<PrivacyPolicy />} />
				<Route path="/chat-privacy-policy" element={<ChatPrivacyPolicy />} />
				<Route path="/pricing" element={<AccountPage />} />
				<Route path="/success" element={<SubscriptionSuccess />} />
				<Route path="/blog/*" element={<BlogRoutes />} />
				<Route path="/" element={<Landing />} />

				<Route element={<AuthLayout />}>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/register" element={<RegistrationPage />} />
				</Route>

				<Route element={<ProtectedRoute loginPath="/login" />}>
					<Route path="/projects" element={<ProjectsPage />} />
					<Route path="/projects/:projectId" element={<ProjectPage />} />
					<Route path="/dashboard" element={<Navigate to="/projects" replace />} />
					<Route path="/account" element={<AccountPage />} />
				</Route>
			</Route>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
};
const App: React.FC = () => {
	return (
		<HelmetProvider>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<BusinessProvider>
						<BrowserRouter>
							<ToastProvider>
								<LoadingProvider>
									<AppRoutes />
								</LoadingProvider>
							</ToastProvider>
						</BrowserRouter>
					</BusinessProvider>
				</AuthProvider>
			</QueryClientProvider>
		</HelmetProvider>
	);
};
export default App;
