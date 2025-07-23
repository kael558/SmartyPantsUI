import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { FaBars, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../services/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useToast } from "../services/ToastProvider";

const MenuDropdown: React.FC = () => {
	const { logout, currentUser } = useAuth();
	const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);
	const navigate = useNavigate();
	const { showToast } = useToast();

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				isMenuDropdownOpen &&
				target instanceof Node &&
				!target.closest(".relative")
			) {
				setIsMenuDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMenuDropdownOpen, setIsMenuDropdownOpen]);

	return (
		<div className="relative ml-3">
			<div>
				<button
					onClick={() => setIsMenuDropdownOpen(!isMenuDropdownOpen)}
					className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors border border-gray-700"
					aria-expanded={isMenuDropdownOpen}
					aria-label="Menu"
				>
					<FaBars className="text-gray-300" />
					<span className="font-medium">Menu</span>
				</button>
			</div>

			<AnimatePresence>
				{isMenuDropdownOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
						className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 z-10 border border-gray-700"
					>
						<div className="py-1" role="menu">
							{currentUser && (
								<div className="px-4 py-3 text-sm text-gray-300 border-b border-gray-700 flex items-center">
									<FaUserCircle className="mr-2 text-gray-400 text-lg" />
									<span className="truncate">
										{currentUser?.email || "Anonymous"}
									</span>
								</div>
							)}

							<button
								onClick={() => {
									navigate("/");
									setIsMenuDropdownOpen(false);
								}}
								className="w-full text-left px-4 py-2  text-gray-300 hover:bg-gray-700 transition-colors"
								role="menuitem"
							>
								Home
							</button>
							{currentUser && (
								<button
									onClick={() => {
										navigate("/projects");
										setIsMenuDropdownOpen(false);
									}}
									className="w-full text-left px-4 py-2  text-gray-300 hover:bg-gray-700 transition-colors"
									role="menuitem"
								>
									Projects
								</button>
							)}

							<button
								onClick={() => {
									if (currentUser) {
										navigate("/account");
									} else {
										navigate("/pricing");
									}

									setIsMenuDropdownOpen(false);
								}}
								className="w-full text-left px-4 py-2  text-gray-300 hover:bg-gray-700 transition-colors"
								role="menuitem"
							>
								{currentUser ? "Manage Plan" : "Pricing"}
							</button>

							<button
								onClick={() => {
									navigate("/release-notes");
									setIsMenuDropdownOpen(false);
								}}
								className="w-full text-left px-4 py-2 border-t border-gray-700  text-gray-300 hover:bg-gray-700 transition-colors"
								role="menuitem"
							>
								Release Notes
							</button>

							<button
								onClick={async () => {
									if (currentUser) {
										await logout();
										showToast("Signed out successfully", "success");
									} else {
										navigate("/register");
									}

									setIsMenuDropdownOpen(false);
								}}
								className="w-full text-left px-4 py-2  text-gray-300 hover:bg-gray-700 transition-colors border-t border-gray-700"
								role="menuitem"
							>
								{currentUser ? "Sign Out" : "Sign In"}
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default MenuDropdown;
