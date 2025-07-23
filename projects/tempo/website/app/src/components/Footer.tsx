import { useNavigate } from "react-router-dom";
import { FaYoutube, FaTiktok, FaInstagram, FaLinkedin } from "react-icons/fa";

const Footer: React.FC<{ props: string }> = ({ props }) => {
	const navigate = useNavigate();

	return (
		<footer
			className={`border-t border-gray-800 py-8 mt-auto w-full ${props}`}
		>
			<div className="container mx-auto px-4">
				<div className="flex flex-col md:flex-row justify-between items-center gap-6">
					<p className="text-gray-400 text-center md:text-left">
						© 2025 Elaratne. All rights reserved.
					</p>
					<div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-4">
						<button
							onClick={() => navigate("/blog")}
							className="text-gray-400 hover:text-blue-500 transition-colors duration-300"
						>
							Blogs
						</button>
						<button
							onClick={() => navigate("/terms-and-conditions")}
							className="text-gray-400 hover:text-blue-500 transition-colors duration-300"
						>
							Terms of Service
						</button>
						<button
							onClick={() => navigate("/privacy-policy")}
							className="text-gray-400 hover:text-blue-500 transition-colors duration-300"
						>
							Privacy Policy
						</button>
						<div className="flex items-center gap-4">
							<a
								href="https://www.linkedin.com/company/web-indexer"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-blue-500"
								aria-label="LinkedIn"
							>
								<FaLinkedin size={24} />
							</a>
							<a
								href="https://www.youtube.com/@WebIndexer"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-blue-500"
								aria-label="YouTube"
							>
								<FaYoutube size={24} />
							</a>
							<a
								href="https://www.tiktok.com/@webindexer.app"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-blue-500"
								aria-label="TikTok"
							>
								<FaTiktok size={24} />
							</a>
							<a
								href="https://www.instagram.com/webindexer.app/"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-blue-500"
								aria-label="Instagram"
							>
								<FaInstagram size={24} />
							</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
