import { motion } from 'motion/react';
import React, { useState } from 'react';
import { FaArrowRight, FaChartLine, FaCheck, FaClock, FaCode, FaRobot } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth, analytics } from '../auth/AuthProvider';
import ChatIcon from '../components/ChatIcon';
import ChatWindow from '../components/ChatWindow';
import Pricing from '../components/Pricing';
import WebPreview from '../components/WebPreview';
import { useBusinessAPI } from '../services/BusinessProvider';
import { useToast } from '../services/ToastProvider';
import SEO from '../components/SEO';
import { logEvent } from "firebase/analytics";


const LeadMagnet: React.FC<{ getStarted: () => void }> = ({ getStarted }) => {
	const { isAuthenticated, claims, loginAnonymously } = useAuth();
	const { checkCrawlStatus, testDomain } = useBusinessAPI();
	const [domain, setDomain] = useState('');
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [loadingStep, setLoadingStep] = useState(0);

	const [showGoButton, setShowGoButton] = useState(false);
	const [project, setProject] = useState<any>(null);

	const { showToast } = useToast();

	const loadingMessages = [
		"Give us 30 seconds! We're scanning your site...",
		"Soon you'll have a lead generating chatbot!",
		"Your customers will thank you and it'll reduce your customer queries by upto 70%!",
		"And 30% more qualified leads for you.",
		"Almost there! Training your custom AI...",
	];

	const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDomain(e.target.value);
		setShowGoButton(e.target.value.length > 0);
	};

	const toggleChat = () => {
		setIsChatOpen(!isChatOpen);
	};

	const handleGoClick = async () => {
		if (!domain) return;

		// check if mobile
		if (window.innerWidth < 768) {
			showToast('Please use a desktop device to view the chatbot preview.', 'error');
			return;
		}

		setIsLoading(true);
		setLoadingStep(0);


		const stepInterval = setInterval(() => {
			setLoadingStep(prev => (prev >= 3 ? 0 : prev + 1));
		}, 5000);

		try {
			logEvent(analytics, 'check_website', { domain });

			if (!isAuthenticated()) await loginAnonymously();

			const project = await testDomain(domain);

			// If domain does not match the projects existing crawl
			if (project?.crawls.length > 0 && project.crawls[0].domain !== domain) {
				showToast('Only one domain can be tested. Please create an account to create more.', 'error');
			}

			setProject(project);
			/*await fetch('https://ncsupco9h9.execute-api.us-east-1.amazonaws.com/dev/test-timeout', {
				method: 'POST',
				body: JSON.stringify({ domain }),
			});*/

			clearInterval(stepInterval);
			setIsLoading(false);
		} catch (error) {
			clearInterval(stepInterval);
			console.error('Error checking website:', error);
			setIsLoading(false);
			showToast('Error checking website. Please try again.', 'error');
		}
	};

	const chatOptions = project?.chatOptions;
	const previewImage = project?.crawls ? project?.crawls[0]?.screenshot : "";

	return (
		<div className="flex flex-col bg-gradient-to-b from-gray-900 to-black  overflow-y-auto">
			<SEO
				title="WebIndexer - AI Chatbot for Websites"
				description="Create an AI chatbot for your website in less than 5 minutes. Improve your customer experience and reduce customer queries by up to 70%."
				keywords='chatbot, ai chatbot, website chatbot, chatbot for website, webindexer, web indexer'
				canonicalUrl='/'
			/>

			<div className="text-white">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					className="text-center max-w-7xl mx-auto px-4 pt-16 pb-20"
				>
					<div className="relative max-w-4xl mx-auto">
						<h2 className="text-4xl md:text-5xl font-bold mb-6 text-blue-400">
							TRY IT RIGHT NOW
						</h2>
						<p className="text-xl md:text-2xl text-gray-300 mb-8">
							What's your domain? Let us create an AI chatbot preview for your website!
						</p>

						<div className={`relative ${(isLoading || project) ? 'hidden' : 'visible'}`}>
							<input
								type="text"
								value={domain}
								onChange={handleDomainChange}
								placeholder="Enter your website URL (e.g., example.com)"
								className="w-full bg-gray-800 border-2 border-blue-500 rounded-full px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										handleGoClick();
									}
								}}
							/>

							{showGoButton && (
								<motion.button
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									className="absolute right-2 top-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold px-6 py-3 rounded-full transition-all duration-300"
									onClick={handleGoClick}
								>
									Go!
								</motion.button>
							)}
						</div>

					</div>

					<div className="mt-12 max-w-7xl mx-auto">
						{isLoading && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="bg-gray-800/70 p-12 rounded-xl shadow-xl"
							>
								<div className="flex flex-col items-center">
									<div className="relative w-32 h-32 mb-6">
										<motion.div
											animate={{ rotate: 360 }}
											transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
											className="w-full h-full border-4 border-blue-500 border-t-transparent rounded-full"
										/>
									</div>
									<motion.p
										key={loadingStep}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ duration: 0.5 }}
										className="text-2xl text-blue-300 font-medium"
									>
										{loadingMessages[loadingStep]}
									</motion.p>
								</div>
							</motion.div>
						)}

						{project && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="bg-gray-900/80 rounded-2xl shadow-2xl min-h-screen p-8 flex flex-col items-center justify-center space-y-6 text-center"
							>
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: "spring", stiffness: 200, damping: 10 }}
									className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
								>
									<FaCheck className="text-white text-5xl" />
								</motion.div>

								<h2 className="text-3xl text-green-300 font-bold">All Finished!</h2>
								<p className="text-lg text-gray-300 max-w-xl">
									Here's a preview of your AI chatbot for <span className="text-indigo-400 font-semibold">{project.chatOptions.businessInfo.businessName}</span>
								</p>
								<p className="text-md text-gray-400 italic max-w-2xl">
									{project.chatOptions.businessInfo.businessDescription}
								</p>

								<div className="relative w-full">
									<div className="h-[700px] w-full border-2 border-indigo-500 shadow-2xl overflow-hidden rounded-lg">
										<WebPreview selectedDomain={project.crawls[0].domain} previewImage={previewImage} />
									</div>
									{isChatOpen ?
										<ChatWindow projectId={project.projectId} chatOptions={chatOptions} onClose={toggleChat} domain={domain} /> :
										<ChatIcon chatOptions={chatOptions} onClick={toggleChat} playWelcomeMessageRef={() => { }} firstLoadRef={{ current: true }} />
									}

								</div>

								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									className="mt-6 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-full flex items-center space-x-2 transition-all duration-300 shadow-lg"
									onClick={getStarted}
								>
									<span>Create Your Own Now</span>
									<FaArrowRight />
								</motion.button>
							</motion.div>
						)}
					</div>
				</motion.div>
			</div>
		</div>
	);
};




const LandingPage = () => {
	const navigate = useNavigate();
	const { isAuthenticated, claims } = useAuth();



	const features = [
		{
			icon: <FaCode className="text-4xl text-blue-500" />,
			title: "5-Minute Setup",
			description: "Quick integration with WordPress, Wix, and all major platforms"
		},
		{
			icon: <FaRobot className="text-4xl text-blue-500" />,
			title: "Lead Collection",
			description: "Qualifies leads and sets them up for you to contact right away"
		},
		{
			icon: <FaClock className="text-4xl text-blue-500" />,
			title: "24/7 Support",
			description: "Automated customer support around the clock"
		},
		{
			icon: <FaChartLine className="text-4xl text-blue-500" />,
			title: "Analytics",
			description: "Track user interactions and improve responses"
		},
	];

	const getStarted = () => {
		logEvent(analytics, 'get_started');
		if (isAuthenticated()) {
			if (claims?.plan === 'None') {
				navigate('/account');
			} else {
				navigate('/projects');
			}
		} else {
			navigate('/register');
		}
	};



	return (
		<div className="min-h-screen text-white">
			{/* Try It Now Hero Section */}
			<LeadMagnet getStarted={getStarted} />

			<div className="container mx-auto px-4 pt-32 pb-20">
				<div className="flex flex-col md:flex-row items-center justify-between gap-12">

					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8 }}
						className="text-center md:text-left md:w-1/2"
					>
						<h1 className="text-5xl  lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
							Create an AI Chatbot for Your Website in Less Than 5 Minutes.
						</h1>
						<p className="text-xl md:text-2xl text-gray-300 mb-12">
							Find out what your customers are asking and save valuable time by automating customer queries.
						</p>

						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
						>
							<button
								className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-xl font-semibold px-8 py-4 rounded-full inline-flex items-center space-x-2 transition-all duration-300 shadow-lg"
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
							<div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-1">
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
			<h2 className="text-4xl font-bold text-center mt-12 ">Simple, Transparent Pricing</h2>
			<Pricing />
			{/* CTA Section */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.8 }}
				className="container mx-auto px-4 py-20"
			>
				<div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-12 text-center">
					<h2 className="text-4xl font-bold mb-6">Ready to Transform Your Website?</h2>
					<p className="text-xl text-gray-300 mb-8">
						{/*Join hundreds of businesses already using WebIndexer to improve their customer experience.*/}
						Improve your customer's experience starting now!
					</p>
					<motion.div
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<button
							onClick={getStarted}
							className="bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-full inline-flex items-center space-x-2 transition-all duration-300">
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