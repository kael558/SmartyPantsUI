import { FC, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../services/AuthProvider";
import { useNavigate } from "react-router-dom";

const AuthLayout: FC = () => {
	const location = useLocation();
	const isLoginPage: boolean = location.pathname === "/login";
	const navigate = useNavigate();

	const { isAuthenticated, authReady, claims, isAnonymous } = useAuth();
	useEffect(() => {
		if (authReady && isAuthenticated() && !isAnonymous()) {
			if (claims?.plan === "None") {
				navigate("/account");
			} else {
				navigate("/projects");
			}
		}
	}, [authReady]);

	if (!authReady) {
		return <div>Loading...</div>;
	}

	return (
		<div className="min-h-screen flex flex-col justify-center items-center space-y-8 bg-gradient-to-b from-gray-900 to-black text-white px-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.2 }}
				className="w-full max-w-md p-8 bg-gray-800/50 rounded-xl border border-gray-700 backdrop-blur-sm"
			>
				<div className="w-full max-w-sm mx-auto">
					<Outlet />
				</div>
				<div className="text-center mt-6">
					{isLoginPage ? (
						<div>
							<span className="text-gray-400">Don&apos;t have an account?</span>{" "}
							<Link
								to="/register"
								className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
							>
								Register here.
							</Link>
						</div>
					) : (
						<div>
							<span className="text-gray-400">Already have an account?</span>{" "}
							<Link
								to="/login"
								className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
							>
								Login here.
							</Link>
						</div>
					)}
				</div>
			</motion.div>
		</div>
	);
};
export default AuthLayout;
