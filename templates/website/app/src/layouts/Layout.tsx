import { FC, useState } from 'react';
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa';
import { useAuth } from "../auth/AuthProvider";
import Footer from '../components/Footer';

import MenuDropdown from '../components/MenuDropdown';

const Layout: FC = () => {
	const navigate = useNavigate();
	const location = useLocation();

	// Check if we're not on the root path
	const canGoBack = location.pathname !== '/' && navigate.length > 1;




	return (
		<div className="flex flex-col bg-gradient-to-b from-gray-900 to-black min-h-screen overflow-y-auto">

			<header className={`text-gray-100 p-3 ${location.pathname.includes("projects/") ? "hidden" : "block"}`}>
				<div className="max-w-7xl mx-auto space-y-12">
					<div className="mb-2 flex justify-between items-center">
						<div className="flex items-center">
							<div
								className="flex items-center space-x-3 cursor-pointer hover:opacity-80"
								onClick={() => navigate("/")}
							>
								<img
									src='https://web-indexer-bucket.s3.us-east-1.amazonaws.com/logo.svg'
									alt='logo'
									className="h-8 md:h-12 w-auto"
								/>
								<img
									src='https://web-indexer-bucket.s3.us-east-1.amazonaws.com/wordmark.png'
									alt='wordmark'
									className="h-6 md:h-8 w-auto mb-[-16px]"
								/>
							</div>

						</div>

						{/* MenuDropdown moved to the right */}
						<div className="flex items-center">
							<MenuDropdown

							/>
						</div>
					</div>
				</div>
			</header>

			<main className="flex-grow">
				<Outlet />
			</main>

			<Footer props={location.pathname.includes("projects/") ? "hidden" : "block"} />
		</div>
	);
};

export default Layout;