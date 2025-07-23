import { useState } from "react";
import { useAuth } from "../services/AuthProvider";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import SEO from "./SEO";

const formStyles = {
	input: `w-full px-4 py-3 mt-2 bg-gray-900/50 border border-gray-700 rounded-lg 
			focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
			text-white placeholder-gray-400 transition-all duration-300`,

	label: `block text-gray-300 font-medium `,

	button: `w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 
			 rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none 
			 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800
			 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
			 font-semibold`,

	error: `text-red-400 text-sm text-center mt-2`,
	divider: `flex items-center my-6`,
	dividerLine: `flex-grow border-t border-gray-600`,
	dividerText: `mx-4 text-gray-400`,
	providerButton: `w-full flex items-center justify-center gap-3 px-4 py-3 
					 border border-gray-700 rounded-lg hover:bg-gray-800 
					 text-white transition-all duration-300 mt-3`,
};

const RegistrationPage = () => {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirmation, setPasswordConfirmation] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { registerWithEmailAndPassword, loginWithGoogle, loginWithFacebook } =
		useAuth();

	const handleRegister = async () => {
		setLoading(true);
		try {
			await registerWithEmailAndPassword({ email, password });
			setPassword("");
			setEmail("");
			navigate("/projects");
		} catch (error: any) {
			setError(error.message);
			return;
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleSignIn = async (): Promise<void> => {
		setLoading(true);
		try {
			await loginWithGoogle();
			navigate("/projects");
		} catch (error) {
			if (error instanceof Error) {
				setError(error.message);
			} else {
				setError("An unexpected error occurred");
			}
		} finally {
			setLoading(false);
		}
	};

	const handleFacebookSignIn = async (): Promise<void> => {
		setLoading(true);
		try {
			await loginWithFacebook();
			navigate("/projects");
		} catch (error) {
			if (error instanceof Error) {
				setError(error.message);
			} else {
				setError("An unexpected error occurred");
			}
		} finally {
			setLoading(false);
		}
	};

	const formValid =
		email && password.length > 4 && password === passwordConfirmation;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6 }}
		>
			<SEO
				title="Register | WebIndexer"
				description="Create a new account to access your projects and settings."
				canonicalUrl="/register"
				keywords="webindexer, register, account, projects"
			/>

			<h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
				Create Account
			</h2>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					handleRegister();
				}}
				className="space-y-6"
			>
				{/* Same input styling as LoginPage */}
				<div>
					<label htmlFor="email" className={formStyles.label}>
						Email
					</label>
					<input
						onChange={(e) => setEmail(e.target.value)}
						value={email}
						id="email"
						type="email"
						className={formStyles.input}
						placeholder="Enter your email address"
						autoComplete="email"
						disabled={loading}
					/>
				</div>
				<div>
					<label htmlFor="password" className={formStyles.label}>
						Password
					</label>
					<input
						id="password"
						type="password"
						autoComplete="current-password"
						className={formStyles.input}
						placeholder="Enter your password"
						onChange={(e) => setPassword(e.target.value)}
						value={password}
						disabled={loading}
					/>
				</div>
				<div>
					<label htmlFor="passwordConfirmation" className={formStyles.label}>
						Confirm Password
					</label>
					<input
						id="passwordConfirmation"
						type="password"
						autoComplete="current-password"
						className={formStyles.input}
						placeholder="Confirm your password"
						onChange={(e) => setPasswordConfirmation(e.target.value)}
						value={passwordConfirmation}
						disabled={loading}
					/>
				</div>
				<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
					<button
						type="submit"
						className={formStyles.button}
						disabled={loading || !formValid}
					>
						{loading ? "Creating account..." : "Create Account"}
					</button>
				</motion.div>
				<div className={formStyles.divider}>
					<div className={formStyles.dividerLine} />
					<span className={formStyles.dividerText}>or</span>
					<div className={formStyles.dividerLine} />
				</div>
				<div>
					<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
						<button
							type="button"
							onClick={handleGoogleSignIn}
							disabled={loading}
							className={formStyles.providerButton}
						>
							<FcGoogle className="text-xl" />
							<span>Continue with Google</span>
						</button>
					</motion.div>

					<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
						<button
							type="button"
							onClick={handleFacebookSignIn}
							disabled={loading}
							className={formStyles.providerButton}
						>
							<FaFacebook className="text-xl" />
							<span>Continue with Facebook</span>
						</button>
					</motion.div>
				</div>
				{error && <div className={formStyles.error}>{error}</div>}
			</form>
		</motion.div>
	);
};

export default RegistrationPage;
