import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
	getAuth,
	signInAnonymously,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	linkWithCredential,
	EmailAuthProvider,
	GoogleAuthProvider,
	FacebookAuthProvider,
	signInWithPopup,
	sendPasswordResetEmail,
	updateProfile,
	User,
	Auth,
	linkWithPopup
} from "firebase/auth";

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

export const app = initializeApp({
	apiKey: "AIzaSyB3iO5CDoW2admJWJ2RKTZ61v9Y0-xupz8",
	authDomain: "webindexer-85a13.firebaseapp.com",
	projectId: "webindexer-85a13",
	storageBucket: "webindexer-85a13.firebasestorage.app",
	messagingSenderId: "906067275119",
	appId: "1:906067275119:web:39e6f25113dc0559814c9a",
	measurementId: "G-SW0ZLBSGK2"
});

export const analytics = getAnalytics(app);


interface AuthProviderProps {
	children: ReactNode;
}

interface AuthContextType {
	authReady: boolean;
	currentUser: User | null;
	loading: boolean;
	loginAnonymously: () => Promise<any>;
	forgotPassword: (data: { email: string }) => Promise<boolean>;
	registerWithEmailAndPassword: (data: { email: string; password: string }) => Promise<any>;
	loginWithEmailAndPassword: (data: { email: string; password: string }) => Promise<any>;
	loginWithGoogle: () => Promise<boolean>;
	loginWithFacebook: () => Promise<boolean>;
	logout: () => Promise<void>;
	getAccessToken: () => Promise<string | false>;
	isAuthenticated: () => boolean;
	isAnonymous: () => boolean | undefined;
	refreshClaims: () => Promise<any>;

	auth: Auth;
	claims: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const auth = getAuth();
	const [currentUser, setCurrentUser] = useState<User | null>(null);

	const [authReady, setAuthReady] = useState(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [claims, setClaims] = useState<any | null>({
		plan: "None",
		subscription: "active",
	});

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((user) => {
			setCurrentUser(user);

			refreshClaims();
		});

		const checkAuthState = async () => {
			await auth.authStateReady(); // Wait for auth state to settle
			setAuthReady(true);
		};

		checkAuthState();

		return () => unsubscribe();
	}, [auth]);


	const getAccessToken = async (): Promise<string | false> => {
		if (!auth.currentUser) {
			return false;
		}

		return (await auth.currentUser.getIdTokenResult(false)).token;
	};

	const isAuthenticated = (): boolean => {
		return auth.currentUser !== null;
	};

	const forgotPassword = async (data: { email: string }): Promise<boolean> => {
		try {
			await sendPasswordResetEmail(auth, data.email);
			return true;
		} catch (error) {
			return false;
		}
	};

	const loginAnonymously = async (): Promise<any> => {
		try {
			const userCredential = await signInAnonymously(auth);
			if (!userCredential) {
				return false;
			}



			return userCredential.user;
		} catch (error) {
			return false;
		}
	};

	const registerWithEmailAndPassword = async (data: { email: string; password: string }): Promise<any> => {
		if (!data.email || !data.password) {
			return false;
		}

		if (auth.currentUser?.isAnonymous) {
			return await linkAnonymousToEmail(data);
		}

		await createUserWithEmailAndPassword(auth, data.email, data.password);

		await updateProfile(auth.currentUser!, {
			displayName: data.email.split('@')[0]
		});
	};

	const linkAnonymousToEmail = async (data: { email: string; password: string }): Promise<boolean> => {
		try {
			const credential = EmailAuthProvider.credential(data.email, data.password);
			const userCredential = await linkWithCredential(auth.currentUser!, credential);

			if (!userCredential) {
				return false;
			}

			await loginWithEmailAndPassword(data);
			return true;
		} catch (error) {
			return false;
		}
	};

	const loginWithEmailAndPassword = async (data: { email: string; password: string }): Promise<any> => {
		if (auth.currentUser && auth.currentUser.isAnonymous) {
			await signOut(auth);
		}

		if (auth.currentUser && !auth.currentUser.isAnonymous) {
			return true;
		}


		await signInWithEmailAndPassword(auth, data.email, data.password);

	};

	const loginWithGoogle = async (): Promise<boolean> => {
		try {
			const provider = new GoogleAuthProvider();

			if (auth.currentUser?.isAnonymous) {
				// Link anonymous account to Google
				const result = await linkWithPopup(auth.currentUser, provider);
				return !!result;
			} else {
				// Regular sign-in with Google
				const result = await signInWithPopup(auth, provider);
				return !!result;
			}
		} catch (error) {
			console.error("Google sign-in error:", error);
			return false;
		}
	};


	const loginWithFacebook = async (): Promise<boolean> => {
		try {
			const provider = new FacebookAuthProvider();

			if (auth.currentUser?.isAnonymous) {
				// Link anonymous account to Facebook
				const result = await linkWithPopup(auth.currentUser, provider);
				return !!result;
			} else {
				// Regular sign-in with Facebook
				const result = await signInWithPopup(auth, provider);
				return !!result;
			}
		} catch (error) {
			console.error("Facebook sign-in error:", error);
			return false;
		}
	};


	const logout = async (): Promise<void> => {
		if (!auth.currentUser) {
			return;
		}

		try {
			await signOut(auth);
		} catch (error) {
			console.error('Error signing out:', error);
		}
	};

	const isAnonymous = (): boolean | undefined => {
		return auth.currentUser?.isAnonymous;
	};

	const refreshClaims = async (): Promise<any> => {
		if (auth.currentUser) {
			const tokenResult = await auth.currentUser.getIdTokenResult(true); // Force refresh

			setClaims({ ...claims, ...tokenResult.claims });
			setLoading(false);
			return tokenResult.claims;
		} else {
			setClaims(null);
			setLoading(false);
			return null;
		}
	};

	const value: AuthContextType = {
		authReady,
		currentUser: auth.currentUser,
		loading,
		loginAnonymously,
		forgotPassword,
		registerWithEmailAndPassword,
		loginWithEmailAndPassword,
		loginWithGoogle,
		loginWithFacebook,
		logout,
		getAccessToken,
		isAuthenticated,
		isAnonymous,
		refreshClaims,
		claims,
		auth
	};

	/*if (!authReady) {
		return <div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				height: '100vh',
				width: '100vw',
			}}
		>
			<div>Loading...</div>
		</div>;
	}*/

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};