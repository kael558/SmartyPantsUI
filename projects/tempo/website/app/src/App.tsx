import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import { BusinessProvider } from "./services/BusinessProvider";
import { LoadingProvider } from "./services/LoadingProvider";
import { AuthProvider } from "./services/AuthProvider";
import { ToastProvider } from "./services/ToastProvider";

import { ProtectedRoute } from "./layouts/ProtectedRoute";
import AuthLayout from "./layouts/AuthLayout";
import Layout from "./layouts/Layout";

import Landing from "./pages/Landing";
import TermsAndConditions from "./pages/ToC";
import PrivacyPolicy from "./pages/PrivacyPolicy";

import LoginPage from "./components/LoginPage";
import RegistrationPage from "./components/RegistrationPage";

const BlogRoutes: React.FC = () => {
	return <Routes></Routes>;
};

const AppRoutes: React.FC = () => {
	return (
		<Routes>
			{/* Public routes first */}
			<Route element={<Layout />}>
				<Route path="/terms-and-conditions" element={<TermsAndConditions />} />
				<Route path="/privacy-policy" element={<PrivacyPolicy />} />

				<Route path="/blog/*" element={<BlogRoutes />} />
				<Route path="/" element={<Landing />} />

				<Route element={<AuthLayout />}>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/register" element={<RegistrationPage />} />
				</Route>

				<Route element={<ProtectedRoute loginPath="/login" />}>
					<Route
						path="/dashboard"
						element={<Navigate to="/projects" replace />}
					/>
				</Route>
			</Route>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
};
const App: React.FC = () => {
	return (
		<HelmetProvider>
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
		</HelmetProvider>
	);
};
export default App;
