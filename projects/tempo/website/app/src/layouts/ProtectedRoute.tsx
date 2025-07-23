import {
	Navigate,
	Outlet,
	useNavigate,
	Link,
	useLocation,
} from "react-router-dom";
import { useAuth } from "../services/AuthProvider";

interface ProtectedRouteProps {
	loginPath: string;
}
/**
 * A simple component that blocks mobile users from accessing the app.
 */
const MobileBlocker: React.FC = () => {
	return (
		<div
			style={{
				height: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "20px",
				backgroundColor: "#f8f9fa",
			}}
		>
			<div
				style={{
					backgroundColor: "white",
					padding: "2.5rem",
					borderRadius: "16px",
					boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
					maxWidth: "300px",
					textAlign: "center",
				}}
			>
				<h1
					style={{
						fontSize: "1.25rem",
						fontWeight: "600",
						marginBottom: "1.5rem",
						color: "#1f2937",
					}}
				>
					Desktop Only
				</h1>
				<p
					style={{
						color: "#6c757d",
						lineHeight: "1.5",
						marginBottom: "1rem",
					}}
				>
					This website is currently only available on desktop devices.
				</p>
				<Link
					to="/"
					style={{
						display: "inline-block",
						padding: "0.75rem 1.5rem",
						backgroundColor: "#6366f1",
						color: "white",
						borderRadius: "8px",
						textDecoration: "none",
						fontWeight: "500",
						transition: "background-color 0.2s",
					}}
					onMouseOver={(e) =>
						(e.currentTarget.style.backgroundColor = "#4f46e5")
					}
					onMouseOut={(e) =>
						(e.currentTarget.style.backgroundColor = "#6366f1")
					}
				>
					Back to Home
				</Link>
			</div>
		</div>
	);
};

/**
 * Simple React Router route that only allows access to authenticated users.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
	loginPath,
}) => {
	const location = useLocation();
	const { isAuthenticated, authReady, claims, loading, isAnonymous } =
		useAuth();
	const isMobile = window.innerWidth < 768;

	if (!authReady || loading) {
		return <div>Loading...</div>;
	}

	if (
		location.pathname !== "/account" &&
		isAuthenticated() &&
		claims?.plan === "None"
	) {
		return <Navigate to="/account" />;
	}

	if (isMobile) {
		return <MobileBlocker />;
	}

	if (isAuthenticated() && isAnonymous()) {
		return <Navigate to="/register" />;
	}

	return isAuthenticated() ? <Outlet /> : <Navigate to={loginPath} />;
};
