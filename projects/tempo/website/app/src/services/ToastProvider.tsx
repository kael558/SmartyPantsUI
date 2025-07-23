import React, { createContext, useContext, useState, useEffect } from 'react';
import { FaCheck, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

type ToastType = 'info' | 'error' | 'success';

interface ToastContextType {
	showToast: (message: string, type?: ToastType, duration?: number) => void;
	hideToast: () => void;
}

const ToastContext = createContext<ToastContextType>({
	showToast: () => { },
	hideToast: () => { },
});

export const useToast = () => useContext(ToastContext);

interface ToastProviderProps {
	children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [message, setMessage] = useState('');
	const [duration, setDuration] = useState(5000);
	const [type, setType] = useState<ToastType>('info');
	const [isExiting, setIsExiting] = useState(false);

	const showToast = (msg: string, toastType: ToastType = 'info', dur: number = 5000) => {
		// If a toast is already showing, hide it first
		if (isOpen) {
			setIsExiting(true);
			setTimeout(() => {
				setIsExiting(false);
				setMessage(msg);
				setType(toastType);
				setDuration(dur);
				setIsOpen(true);
			}, 300); // Match the exit animation duration
		} else {
			setMessage(msg);
			setType(toastType);
			setDuration(dur);
			setIsOpen(true);
		}
	};

	const hideToast = () => {
		setIsExiting(true);
		setTimeout(() => {
			setIsOpen(false);
			setIsExiting(false);
		}, 300); // Match the exit animation duration
	};

	useEffect(() => {
		let timer: NodeJS.Timeout;
		if (isOpen && !isExiting) {
			timer = setTimeout(() => {
				hideToast();
			}, duration);
		}
		return () => {
			if (timer) clearTimeout(timer);
		};
	}, [isOpen, duration, isExiting]);

	const getToastStyles = () => {
		// Base styles shared by all toast types
		const baseStyles = `
      fixed bottom-4 left-1/2 transform -translate-x-1/2
      px-5 py-3 rounded-lg shadow-xl z-50 
      max-w-md w-[90%] 
      font-medium border border-gray-700
      flex items-center justify-between
      transition-all duration-300 ease-in-out
    `;

		// Type-specific gradients and text colors
		const typeStyles = {
			success: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400',
			info: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400',
			error: 'bg-gradient-to-r from-red-500 to-rose-500 text-red-100',
		};

		// Animation classes
		const animationStyles = isExiting
			? 'animate-fade-out-down opacity-0 translate-y-2'
			: 'animate-fade-in-up opacity-100';

		return `${baseStyles} ${typeStyles[type]} ${animationStyles}`;
	};

	const getGlowStyles = () => {
		const baseGlowStyles = `
      absolute inset-0 rounded-lg blur-xl -z-10
      transition-opacity duration-300
    `;

		const typeGlowStyles = {
			success: 'bg-emerald-500/20',
			info: 'bg-blue-500/20',
			error: 'bg-red-500/20',
		};

		return `${baseGlowStyles} ${typeGlowStyles[type]}`;
	};

	const getIcon = () => {
		switch (type) {
			case 'info':
				return <FaInfoCircle className="text-lg" />;
			case 'error':
				return <FaExclamationTriangle className="text-lg" />;
			case 'success':
				return <FaCheck className="text-lg" />;
			default:
				return <FaInfoCircle className="text-lg" />;
		}
	};

	return (
		<ToastContext.Provider value={{ showToast, hideToast }}>
			{children}
			{isOpen && (
				<div
					className={getToastStyles()}
					role="alert"
				>
					{/* Glow effect */}
					<div className={getGlowStyles()}></div>

					<div className="flex items-center space-x-3">
						{getIcon()}
						<p>{message}</p>
					</div>

					<button
						onClick={hideToast}
						className="ml-2 p-1 rounded-full hover:bg-gray-700/30 transition-colors"
						aria-label="Close toast"
					>
						<FaTimes />
					</button>
				</div>
			)}
		</ToastContext.Provider>
	);
};