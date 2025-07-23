import React, { useState, useEffect } from "react";
import { useBusinessAPI } from "../services/BusinessProvider";
import { useAuth, analytics } from "../services/AuthProvider";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "../services/ToastProvider";
import { logEvent } from "firebase/analytics";
import { useLoading } from "../services/LoadingProvider";

const CancelModal: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
	const [isLoading, setIsLoading] = useState(false);
	const handleConfirm = async () => {
		setIsLoading(true);
		await onConfirm();
		setIsLoading(false);
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					key={"uniqueueu"}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
				>
					<motion.div
						initial={{ scale: 0.95, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.95, opacity: 0 }}
						className="bg-gray-800 p-8 rounded-xl max-w-md w-full mx-4"
					>
						<h3 className="text-xl font-bold mb-4">Cancel Subscription</h3>
						<p className="text-gray-300 mb-6">
							Are you sure you want to cancel your subscription? You'll continue
							to have access until the end of your current billing period.
						</p>
						<div className="flex justify-end space-x-4">
							<button
								disabled={isLoading}
								onClick={onClose}
								className={`px-4 py-2 rounded-lg ${
									isLoading
										? "bg-gray-600 cursor-not-allowed"
										: "bg-gray-700 hover:bg-gray-600"
								} transition-colors`}
							>
								Keep Subscription
							</button>
							<button
								disabled={isLoading}
								onClick={handleConfirm}
								className={`px-4 py-2 rounded-lg flex items-center justify-center ${
									isLoading
										? "bg-red-600 cursor-not-allowed"
										: "bg-red-500 hover:bg-red-600"
								} transition-colors`}
							>
								{isLoading ? (
									<>
										<svg
											className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
										Canceling...
									</>
								) : (
									"Cancel Subscription"
								)}
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

const Pricing = () => {
	const navigate = useNavigate();
	const { isAuthenticated, refreshClaims, claims } = useAuth();
	const { showLoading, hideLoading } = useLoading();

	console.log(claims);

	// May 1st, 2025
	/*const claims = {
		plan: "Starter",
		subscription: "canceled",
		stripeCustomerId: "cus_S3K0SKdCqz4BAr",
		cancel_at_period_end: false,
		current_period_end: 1746138741,
		hasUsedTrial: true,
		hasPaymentMethod: true,
		paymentMethodAddedAt: 1746142341,
	};

	// =================================================================
	// TEST CASES - Copy/paste these to test different UI states
	// =================================================================

	// 1. New user (no subscription, no trial used)
	/*
		const current_period_end_future = 1751403119;
	const current_period_end_past = 1714588800;
	const claims = {
		plan: "None",
		subscription: null,
		stripeCustomerId: null,
		cancel_at_period_end: false,
		current_period_end: null,
		hasUsedTrial: false,
		hasPaymentMethod: false,
		paymentMethodAddedAt: null,
	};*/

	// 2. User on Starter trial (no payment method added yet)
	/*const claims = {
		plan: "Starter",
		subscription: "trialing",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: current_period_end_future,
		hasUsedTrial: true,
		hasPaymentMethod: false,
		paymentMethodAddedAt: null,
	};*/

	// 3. User on Starter trial (with payment method, will auto-bill)
	/*const claims = {
		plan: "Starter",
		subscription: "trialing",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: current_period_end_future,
		hasUsedTrial: true,
		hasPaymentMethod: true,
		paymentMethodAddedAt: 1736985000, // Jan 15, 2025
	};*/

	// 4. User on Starter trial (canceled, will end at period end)
	/*const claims = {
		plan: "Starter",
		subscription: "trialing",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: true,
		current_period_end: current_period_end_future,
		hasUsedTrial: true,
		hasPaymentMethod: true,
		paymentMethodAddedAt: 1736985000, // Jan 15, 2025
	};*/

	// 5. User with active Starter subscription
	/*const claims = {
		plan: "Starter",
		subscription: "active",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: current_period_end_future, // Feb 15, 2025
		hasUsedTrial: true,
		hasPaymentMethod: true,
		paymentMethodAddedAt: 1736985000, // Jan 15, 2025
	};*/

	// 6. User with active Pro subscription
	/*const claims = {
		plan: "Pro",
		subscription: "active",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: 1751584888, // Jul 3, 2025
		hasUsedTrial: true,
		hasPaymentMethod: true,
		paymentMethodAddedAt: 1750351360, // Jul 18, 2025
	};*/

	// 7. User with canceled subscription (will end at period end)
	/*const claims = {
		plan: "Starter",
		subscription: "active",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: true,
		current_period_end: current_period_end_future, // Feb 15, 2025
		hasUsedTrial: true,
		hasPaymentMethod: true,
		paymentMethodAddedAt: 1736985000, // Jan 15, 2025
	};*/

	// 8. User with ended subscription (past period end)
	/*const claims = {
		plan: "Starter",
		subscription: "canceled",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: 1735689600, // Jan 1, 2025 (past date)
		hasUsedTrial: true,
		hasPaymentMethod: true,
		paymentMethodAddedAt: 1733097600, // Dec 1, 2024
	};*/

	// 9. User who had trial, subscription ended, wants to resubscribe
	/*const claims = {
		plan: "None",
		subscription: "canceled",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: 1735689600, // Jan 1, 2025
		hasUsedTrial: true,
		hasPaymentMethod: false,
		paymentMethodAddedAt: null,
	};*/

	// 10. User with incomplete subscription (payment failed)
	/*const claims = {
		plan: "Starter",
		subscription: "incomplete",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: current_period_end_future, // Feb 15, 2025
		hasUsedTrial: true,
		hasPaymentMethod: false,
		paymentMethodAddedAt: null,
	};*/

	// 11. User with past_due subscription
	/*const claims = {
		plan: "Starter",
		subscription: "past_due",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: 1737072000, // Jan 16, 2025
		hasUsedTrial: true,
		hasPaymentMethod: true,
		paymentMethodAddedAt: 1735689600, // Jan 1, 2025
	};*/

	// 12. Edge case: User with trial expired but no payment method
	/*const claims = {
		plan: "Starter",
		subscription: "trialing",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: 1735689600, // Jan 1, 2025 (expired)
		hasUsedTrial: true,
		hasPaymentMethod: false,
		paymentMethodAddedAt: null,
	};*/

	// =================================================================
	// ADDITIONAL REAL-WORLD TEST CASES
	// =================================================================

	// 13. User with subscription ending tomorrow (good for testing urgency)
	/*const claims1 = {
		plan: "Starter",
		subscription: "active",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: true,
		current_period_end: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
		hasUsedTrial: true,
		hasPaymentMethod: true,
		paymentMethodAddedAt: 1735689600,
	};

	// 14. User with trial ending in 2 hours (urgent)
	const claims2 = {
		plan: "Starter",
		subscription: "trialing",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
		hasUsedTrial: true,
		hasPaymentMethod: false,
		paymentMethodAddedAt: null,
	};

	// 15. User with expired trial (1 day ago)
	const claims3 = {
		plan: "Starter",
		subscription: "trialing",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: Math.floor(Date.now() / 1000) - 86400, // Yesterday
		hasUsedTrial: true,
		hasPaymentMethod: false,
		paymentMethodAddedAt: null,
	};

	// 16. User with subscription that ended 1 week ago
	const claims4 = {
		plan: "Pro",
		subscription: "canceled",
		stripeCustomerId: "cus_test123",
		cancel_at_period_end: false,
		current_period_end: Math.floor(Date.now() / 1000) - 604800, // 1 week ago
		hasUsedTrial: true,
		hasPaymentMethod: true,
		paymentMethodAddedAt: 1735689600,
	};*/

	// =================================================================

	const {} = useBusinessAPI();
	const [creatingCheckout, setCreatingCheckout] = useState<string | null>(null);
	const { showToast } = useToast();
	const selectedPlan = claims?.plan;
	const [_, refreshUI] = useState(0);
	const [currency, setCurrency] = useState("ca"); // 'ca' or 'us'
	const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' or 'yearly'

	// call refresh claims
	useEffect(() => {
		if (isAuthenticated()) {
			refreshClaims();
		}
	}, []);

	const fixDate = (date: string | number | Date): any => {
		if (!date) return null;

		// if date is already a date object, return it
		if (date instanceof Date) return date;

		// return Date object from ISOString or timestamp number
		if (typeof date === "string") {
			return new Date(date);
		}
		return new Date(date * 1000);
	};

	// Helper function to format date
	const formatDate = (date: Date) => {
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const pricingPlans = [
		{
			title: "Starter",
			prices: {
				us_monthly: 14.99,
				us_yearly: 149.99,
				ca_monthly: 19.99,
				ca_yearly: 199.99,
			},
			lookup_keys: {
				us_monthly: "starter_v2_US",
				us_yearly: "starter_US_yearly",
				ca_monthly: "starter_v2",
				ca_yearly: "starter_yearly",
			},
			features: [
				"1,000 chat messages monthly",

				"Basic analytics dashboard",
				"Mobile integration",
				"3 domains with 100 pages each",
				"Monthly data updates",
				"Up to 3 projects",
				"Document upload support",
			],
			free_trial: 30,
		},
		{
			title: "Premium",
			prices: {
				us_monthly: 36.99,
				us_yearly: 369.99,
				ca_monthly: 49.99,
				ca_yearly: 499.99,
			},
			lookup_keys: {
				us_monthly: "premium_US_monthly",
				us_yearly: "premium_US_yearly",
				ca_monthly: "premium_CAD_monthly",
				ca_yearly: "premium_CAD_yearly",
			},
			features: [
				"Everything in Starter, plus:",
				"2,500 chat messages monthly",
				"Full widget customization",
				"Advanced analytics dashboard",

				"5 domains with 1,000 pages each",
				"Weekly data updates",
				"Up to 5 projects",
				"Remove 'Powered by' branding",
				"Priority email support",
			],
		},
		{
			title: "Pro",
			prices: {
				us_monthly: 79.99,
				us_yearly: 799.99,
				ca_monthly: 99.99,
				ca_yearly: 999.99,
			},
			lookup_keys: {
				us_monthly: "pro_US_monthly",
				us_yearly: "pro_US_yearly",
				ca_monthly: "pro_v2",
				ca_yearly: "pro_v2_yearly",
			},
			features: [
				"Everything in Premium, plus:",
				"5,000 chat messages monthly",
				"Dedicated account manager",
				"Custom reporting tools",
				"10 domains with 10,000 pages",
				"Daily data updates",
				"Up to 10 projects",
				"AI automation features",

				"Zapier integration included",
			],
		},
	];

	const handlePlanSelection = async (priceId: string) => {
		if (!isAuthenticated()) {
			navigate("/register");
			return;
		}

		setCreatingCheckout(priceId); // Set the current plan for checkout
		/* 
		try {
			const { message, url, id } = await subscribe(priceId);

			if (message) {
				logEvent(analytics, "resubscribe", { plan: priceId });

				// wait for 2 seconds before refreshing the page
				await new Promise((resolve) => setTimeout(resolve, 2000));
				showToast(message, "success");

				// trigger a UI refresh
				await refreshClaims();
				refreshUI((prev) => prev + 1);
				return;
			}

			if (!url) {
				throw new Error("Failed to create checkout session");
			}

			logEvent(analytics, "begin_checkout");

			// redirect to the checkout page
			window.location.href = url;
		} catch (error) {
			console.error("Error creating checkout session:", error);
			showToast("Failed to create checkout session.", "error");
		} finally {
			setCreatingCheckout(null); // Reset state after process
		}*/
	};
	const handleAddPaymentMethod = async () => {
		if (!isAuthenticated()) {
			navigate("/register");
			return;
		}

		setCreatingCheckout("payment");

		/*
		try {
			const { url, id } = await addPaymentMethod();

			if (!url) {
				throw new Error("Failed to create checkout session");
			}

			logEvent(analytics, "add_payment_method");
			// redirect to the checkout page
			window.location.href = url;
		} catch (error) {
			console.error("Error creating checkout session:", error);
			showToast("Failed to add payment method.", "error");
		} finally {
			setCreatingCheckout(null); // Reset state after process
		}*/
	};

	const handleCancelSubscription = async () => {
		if (!isAuthenticated()) {
			navigate("/register");
			return;
		}

		setCreatingCheckout("cancel");
		/*
		try {
			await cancelSubscription();
			// wait for 5 seconds before refreshing the page
			await new Promise((resolve) => setTimeout(resolve, 5000));

			// trigger a UI refresh
			await refreshClaims();

			logEvent(analytics, "cancel_subscription");

			showToast("Subscription canceled successfully.", "success");
			refreshUI((prev) => prev + 1);
		} catch (error) {
			console.error("Error creating checkout session:", error);
			showToast("Failed to cancel subscription.", "error");
		} finally {
			setCreatingCheckout(null); // Reset state after process
		}*/
	};

	const handleManageSubscription = async () => {
		if (!isAuthenticated()) {
			navigate("/register");
			return;
		}

		showLoading();

		setCreatingCheckout("portal");

		/*try {
			const { url } = await createPortalSession();

			if (!url) {
				throw new Error("Failed to create portal session");
			}

			logEvent(analytics, "manage_subscription");

			// open in new tab
			window.open(url, "_blank");
		} catch (error) {
			console.error("Error creating portal session:", error);
			showToast("Failed to open subscription management.", "error");
		} finally {
			setCreatingCheckout(null);
			hideLoading();
		}*/
	};

	// =================================================================
	// HELPER FUNCTIONS FOR SIMPLIFIED STATE MANAGEMENT
	// =================================================================

	// Check if a date is in the past (handles both unix timestamps and ISO strings)
	const isExpired = (date: string | number | null) => {
		if (!date) return false;

		// If it's a number, treat it as unix timestamp
		if (typeof date === "number") {
			return new Date() > new Date(date * 1000);
		}

		// If it's a string, treat it as ISO date
		return new Date() > new Date(date);
	};

	// Get simplified subscription state
	const getSubscriptionState = (claims: any) => {
		if (!claims || claims.plan === "None") return "no_subscription";

		const periodExpired = isExpired(claims.current_period_end);

		if (claims.subscription === "trialing") {
			if (periodExpired) return "trial_expired";
			// If trial is canceled (cancel_at_period_end is true), treat as ending
			if (claims.cancel_at_period_end) return "subscription_ending";
			return claims.hasPaymentMethod
				? "trial_with_payment"
				: "trial_no_payment";
		}

		if (claims.subscription === "canceled" || periodExpired)
			return "subscription_ended";
		if (claims.cancel_at_period_end) return "subscription_ending";
		if (["incomplete", "past_due", "unpaid"].includes(claims.subscription))
			return "payment_failed";

		return "subscription_active";
	};

	// Get user-friendly status message
	const getStatusMessage = (state: string, claims: any) => {
		const periodEnd = claims?.current_period_end
			? formatDate(claims.current_period_end)
			: "";

		switch (state) {
			case "trial_no_payment":
				return `Free trial ends ${periodEnd}. Add a payment method to continue.`;
			case "trial_with_payment":
				return `Billing will start on ${periodEnd}`;
			case "trial_expired":
				return `Free trial ended ${periodEnd}. Please subscribe to continue.`;
			case "subscription_active":
				return `Next billing date: ${periodEnd}`;
			case "subscription_ending":
				// Handle both canceled trials and canceled subscriptions
				const isTrialEnding = claims?.subscription === "trialing";
				return isTrialEnding
					? `Your free trial will end on ${periodEnd}`
					: `Your subscription will end on ${periodEnd}`;
			case "subscription_ended":
				return `Your subscription ended on ${periodEnd}. Subscribe to continue using the service.`;
			case "payment_failed":
				return `Payment failed. Please update your payment method to continue service.`;
			default:
				return "";
		}
	};

	// Function to determine button text for plan changes
	const getPlanChangeText = (currentPlan: string, targetPlan: string) => {
		const planOrder = { Starter: 1, Premium: 2, Pro: 3 } as any;
		return planOrder[targetPlan] > planOrder[currentPlan]
			? "Upgrade"
			: "Downgrade";
	};

	const renderActionButton = (plan: any) => {
		const isCurrentPlan =
			claims?.plan?.toLowerCase() === plan.title.toLowerCase();

		// Safely fix dates only if claims exists
		if (claims) {
			claims.current_period_end = fixDate(claims.current_period_end);
			claims.paymentMethodAddedAt = fixDate(claims.paymentMethodAddedAt);
		}

		const subscriptionState = getSubscriptionState(claims);
		const statusMessage = getStatusMessage(subscriptionState, claims);

		// Not authenticated - show sign up
		if (!isAuthenticated()) {
			return (
				<button
					onClick={() => navigate("/register")}
					className="w-full font-semibold px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
				>
					Sign Up
				</button>
			);
		}

		// Current plan - show status and actions
		if (isCurrentPlan) {
			return (
				<div className="space-y-2">
					{/* Status message */}
					{statusMessage && (
						<div
							className={`text-sm text-center ${
								subscriptionState === "payment_failed" ||
								subscriptionState === "subscription_ended" ||
								subscriptionState === "trial_expired"
									? "text-red-500"
									: subscriptionState === "subscription_ending"
									? "text-orange-500"
									: "text-yellow-500"
							}`}
						>
							{statusMessage}
						</div>
					)}

					{/* Action buttons based on state */}
					{subscriptionState === "trial_no_payment" && (
						<button
							onClick={handleAddPaymentMethod}
							className="w-full font-semibold px-6 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white"
							disabled={creatingCheckout === "payment"}
						>
							{creatingCheckout === "payment"
								? "Processing..."
								: "Add Payment Method"}
						</button>
					)}

					{(subscriptionState === "subscription_active" ||
						subscriptionState === "trial_with_payment") && (
						<button
							onClick={handleCancelSubscription}
							className="w-full font-semibold px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white"
							disabled={creatingCheckout === "cancel"}
						>
							{creatingCheckout === "cancel"
								? "Processing..."
								: "Cancel Subscription"}
						</button>
					)}

					{subscriptionState === "subscription_ending" && (
						<button
							onClick={() => handlePlanSelection(plan.lookup_key)}
							className="w-full font-semibold px-6 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white"
							disabled={creatingCheckout !== null}
						>
							{creatingCheckout === plan.lookup_key
								? "Processing..."
								: "Resubscribe"}
						</button>
					)}

					{(subscriptionState === "subscription_ended" ||
						subscriptionState === "trial_expired") && (
						<button
							onClick={() => handlePlanSelection(plan.lookup_key)}
							className="w-full font-semibold px-6 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white"
							disabled={creatingCheckout !== null}
						>
							{creatingCheckout === plan.lookup_key
								? "Processing..."
								: "Resubscribe"}
						</button>
					)}

					{subscriptionState === "payment_failed" && (
						<>
							<button
								onClick={handleAddPaymentMethod}
								className="w-full font-semibold px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white"
								disabled={creatingCheckout === "payment"}
							>
								{creatingCheckout === "payment"
									? "Processing..."
									: "Update Payment Method"}
							</button>
							<button
								onClick={handleCancelSubscription}
								className="w-full font-semibold px-6 py-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white text-sm"
								disabled={creatingCheckout === "cancel"}
							>
								{creatingCheckout === "cancel"
									? "Processing..."
									: "Cancel Subscription"}
							</button>
						</>
					)}
				</div>
			);
		}

		// Different plan - show upgrade/downgrade option
		if (subscriptionState !== "no_subscription" && claims?.plan !== "None") {
			const actionText = claims
				? getPlanChangeText(claims.plan, plan.title)
				: "Subscribe";
			return (
				<button
					onClick={() => handlePlanSelection(plan.lookup_key)}
					className={`w-full font-semibold px-6 py-3 rounded-full text-white ${
						actionText === "Upgrade"
							? "bg-blue-500 hover:bg-blue-600"
							: "bg-gray-500 hover:bg-gray-600"
					}`}
					disabled={creatingCheckout !== null}
				>
					{creatingCheckout === plan.lookup_key ? "Processing..." : actionText}
				</button>
			);
		}

		// New subscription - show subscribe/trial button
		return (
			<button
				onClick={() => handlePlanSelection(plan.lookup_key)}
				className="w-full font-semibold px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
				disabled={creatingCheckout !== null}
			>
				{creatingCheckout === plan.lookup_key
					? "Processing..."
					: plan.free_trial && !claims?.hasUsedTrial
					? "Start Free Trial"
					: "Subscribe"}
			</button>
		);
	};

	return (
		<div className="container mx-auto px-4 py-5 text-white">
			<div className="flex justify-center">
				<div className="max-w-7xl">
					<div className="flex justify-center items-center gap-8 mb-12">
						<div className="flex items-center gap-4 p-1 rounded-full bg-gray-700">
							<button
								onClick={() => setBillingCycle("monthly")}
								className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
									billingCycle === "monthly"
										? "bg-blue-500 text-white shadow-lg"
										: "bg-transparent text-gray-300 hover:bg-gray-600/50"
								}`}
							>
								Monthly
							</button>
							<button
								onClick={() => setBillingCycle("yearly")}
								className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
									billingCycle === "yearly"
										? "bg-blue-500 text-white shadow-lg"
										: "bg-transparent text-gray-300 hover:bg-gray-600/50"
								}`}
							>
								Yearly
							</button>
						</div>
						<div className="flex items-center gap-4 p-1 rounded-full bg-gray-700">
							<button
								onClick={() => setCurrency("ca")}
								className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
									currency === "ca"
										? "bg-green-500 text-white shadow-lg"
										: "bg-transparent text-gray-300 hover:bg-gray-600/50"
								}`}
							>
								CAD
							</button>
							<button
								onClick={() => setCurrency("us")}
								className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
									currency === "us"
										? "bg-green-500 text-white shadow-lg"
										: "bg-transparent text-gray-300 hover:bg-gray-600/50"
								}`}
							>
								USD
							</button>
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
						{pricingPlans.map((plan, index) => {
							const priceKey =
								`${currency}_${billingCycle}` as keyof typeof plan.prices;
							const lookupKey = plan.lookup_keys[priceKey];
							const price = plan.prices[priceKey];
							const currencyLabel = currency.toUpperCase();

							return (
								<motion.div
									key={index}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{
										duration: 0.5,
										delay: index * 0.1,
									}}
									className={`
	bg-gray-800/50 p-8 rounded-xl transition-all duration-300 relative overflow-hidden min-w-96 max-w-96
							${plan.title === "Premium" ? "border-2 border-blue-500" : ""}
							${
								selectedPlan?.toLowerCase() === plan.title.toLowerCase()
									? "border-2 border-green-500 scale-105 shadow-xl bg-gray-800/80"
									: "hover:bg-gray-800/80"
							}
						  `}
								>
									{selectedPlan?.toLowerCase() !== plan.title.toLowerCase() &&
										plan.title === "Premium" && (
											<div className="absolute top-5 -right-12 rotate-45 bg-blue-500 text-white px-12 py-1 text-sm font-semibold shadow-lg transform">
												Best Value
											</div>
										)}
									{selectedPlan?.toLowerCase() === plan.title.toLowerCase() && (
										<div className="absolute top-5 -right-12 rotate-45 bg-green-500 text-white px-12 py-1 text-sm font-semibold shadow-lg transform">
											Current Plan
										</div>
									)}
									{!(
										selectedPlan?.toLowerCase() === plan.title.toLowerCase()
									) &&
										plan.free_trial &&
										!claims?.hasUsedTrial && (
											<div className="absolute top-5 -right-12 rotate-45 bg-orange-500 text-white px-12 py-1 text-sm font-semibold shadow-lg transform">
												30-Day Trial
											</div>
										)}

									<h3
										className={`text-2xl font-bold mb-4 ${
											selectedPlan?.toLowerCase() === plan.title.toLowerCase()
												? "text-green-500"
												: ""
										}`}
									>
										{plan.title}
									</h3>
									<div className="text-3xl font-bold mb-6">
										${price} <span className="text-xl">{currencyLabel}</span>
										<span className="text-lg text-gray-400">
											/{billingCycle === "monthly" ? "month" : "year"}
										</span>
									</div>

									<ul className="space-y-4">
										{plan.features.map((feature, featureIndex) => (
											<li key={featureIndex} className="flex items-start">
												<span
													className={`mr-2 ${
														selectedPlan?.toLowerCase() ===
														plan.title.toLowerCase()
															? "text-green-500"
															: plan.title === "Premium"
															? "text-blue-500"
															: "text-gray-500"
													}`}
												>
													✓
												</span>
												<span className="text-gray-300 text-sm">{feature}</span>
											</li>
										))}
									</ul>

									<div className="mt-8">
										{renderActionButton({
											...plan,
											lookup_key: lookupKey,
										})}
									</div>
								</motion.div>
							);
						})}
					</div>

					{/* Subscription Management Section - Only show for authenticated users with active subscriptions */}
					{isAuthenticated() && claims && claims.stripeCustomerId && (
						<p
							onClick={handleManageSubscription}
							className="text-blue-500 mx-auto flex items-center gap-2 justify-center cursor-pointer"
						>
							Click here to manage your subscription
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default Pricing;
