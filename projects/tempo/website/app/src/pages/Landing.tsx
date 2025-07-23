import { motion } from "motion/react";
import React, { useState } from "react";
import {
	FaArrowRight,
	FaChartLine,
	FaCheck,
	FaClock,
	FaCode,
	FaRobot,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth, analytics } from "../services/AuthProvider";

import Pricing from "../components/Pricing";

import { useBusinessAPI } from "../services/BusinessProvider";
import { useToast } from "../services/ToastProvider";
import SEO from "../components/SEO";
import { logEvent } from "firebase/analytics";

const LandingPage = () => {
	const navigate = useNavigate();
	const { isAuthenticated, claims } = useAuth();

	const features = [
		{
			icon: <FaCode className="text-4xl text-yellow-500" />,
			title: "5-Minute Setup",
			description:
				"Quick integration with WordPress, Wix, and all major platforms",
		},
		{
			icon: <FaRobot className="text-4xl text-yellow-500" />,
			title: "Lead Collection",
			description:
				"Qualifies leads and sets them up for you to contact right away",
		},
		{
			icon: <FaClock className="text-4xl text-yellow-500" />,
			title: "24/7 Support",
			description: "Automated customer support around the clock",
		},
		{
			icon: <FaChartLine className="text-4xl text-yellow-500" />,
			title: "Analytics",
			description: "Track user interactions and improve responses",
		},
	];

	const getStarted = () => {
		logEvent(analytics, "get_started");
		if (isAuthenticated()) {
			if (claims?.plan === "None") {
				navigate("/account");
			} else {
				navigate("/projects");
			}
		} else {
			navigate("/register");
		}
	};

	return (
		<div className="min-h-screen text-white">
			<div className="container mx-auto px-4 pt-32 pb-20">
				<div className="flex flex-col md:flex-row items-center justify-between gap-12">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8 }}
						className="text-center md:text-left md:w-1/2"
					>
						<h1 className="text-5xl  lg:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-amber-500 text-transparent bg-clip-text">
							Create an AI Chatbot for Your Website in Less Than 5 Minutes.
						</h1>
						<p className="text-xl md:text-2xl text-gray-300 mb-12">
							Find out what your customers are asking and save valuable time by
							automating customer queries.
						</p>

						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<button
								className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-xl font-semibold px-8 py-4 rounded-full inline-flex items-center space-x-2 transition-all duration-300 shadow-lg"
								onClick={getStarted}
							>
								<span>Get Started</span>
								<FaArrowRight />
							</button>
						</motion.div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="md:w-1/2"
					>
						<div className="relative">
							<div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl p-1">
								<div className="bg-gray-800 rounded-lg p-4">
									<video
										className="rounded-lg shadow-2xl w-full"
										autoPlay
										loop
										muted
										playsInline
									>
										<source
											src="https://web-indexer-bucket.s3.us-east-1.amazonaws.com/demo.mp4"
											type="video/mp4"
										/>
										Your browser does not support the video tag.
									</video>
								</div>
							</div>
						</div>
					</motion.div>
				</div>
			</div>

			{/* Features Section */}
			<div className="container mx-auto px-4 py-20">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
					{features.map((feature, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="bg-gray-800/50 p-6 rounded-xl hover:bg-gray-800/80 transition-all duration-300"
						>
							<div className="mb-4">{feature.icon}</div>
							<h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
							<p className="text-gray-400">{feature.description}</p>
						</motion.div>
					))}
				</div>
			</div>

			{/* Pricing Section */}
			<h2 className="text-4xl font-bold text-center mt-12 ">
				Simple, Transparent Pricing
			</h2>
			<Pricing />
			{/* CTA Section */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.8 }}
				className="container mx-auto px-4 py-20"
			>
				<div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-2xl p-12 text-center">
					<h2 className="text-4xl font-bold mb-6">
						Ready to Transform Your Website?
					</h2>
					<p className="text-xl text-gray-300 mb-8">
						Improve your customer's experience starting now!
					</p>
					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<button
							onClick={getStarted}
							className="bg-yellow-500 hover:bg-yellow-600 text-white text-lg font-semibold px-8 py-4 rounded-full inline-flex items-center space-x-2 transition-all duration-300"
						>
							<span>Start Free Trial</span>
							<FaArrowRight />
						</button>
					</motion.div>
				</div>
			</motion.div>
		</div>
	);
};

export default LandingPage;
