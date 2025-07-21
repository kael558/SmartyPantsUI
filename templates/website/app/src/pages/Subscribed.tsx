import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useAuth } from '../auth/AuthProvider';

const SubscriptionSuccess = () => {
	const navigate = useNavigate();
	const width = window.innerWidth;
	const height = window.innerHeight;
	const { refreshClaims } = useAuth();

	useEffect(() => {
		// Analytics tracking could go here
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = 'auto';
		};
	}, []);

	const handleContinue = async () => {
		await refreshClaims();
		navigate('/projects');
	};

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm z-50">
			<Confetti
				width={width}
				height={height}
				recycle={false}
				numberOfPieces={200}
				gravity={0.15}
			/>

			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{
					type: "spring",
					stiffness: 260,
					damping: 20,
					duration: 0.5
				}}
				className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 md:p-10 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-700"
			>
				<div className="flex flex-col items-center text-center">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
						transition={{ delay: 0.3, duration: 0.8 }}
						className="text-5xl mb-6"
					>
						🎉
					</motion.div>

					<motion.div
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.6 }}
					>
						<h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
							Subscription Successful!
						</h2>

						<p className="text-gray-300 mb-6">
							Thank you for subscribing to WebIndexer! Your account has been upgraded and is ready to use.
						</p>

						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleContinue}
							className="w-full py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg flex items-center justify-center space-x-2"
							aria-label="Continue to Projects"
						>
							<span>Continue to Projects</span>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
							</svg>
						</motion.button>
					</motion.div>
				</div>
			</motion.div>
		</div>
	);
};

export default SubscriptionSuccess;