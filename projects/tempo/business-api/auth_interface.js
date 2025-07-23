import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// TODO: Load from service-account.json
const serviceAccount = {
	type: "service_account",
	project_id: "foundrscope",
	private_key_id: "0db4eecf6bd6bc33944d659e3fb12402859b3bf2",
	private_key:
		"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDorrZAzn1Ob0FZ\no0PDvTSA97WBdddtNoRSr1Od0d6zXUeVSkJPzMU+I71fxAXXNcHBYCTh07gtZU8C\nCAo+06O+pbci8GQrzAH2uJOAmQcfgAsQ/K1xE5t+Z2GrWzJg9ZfYkB35rERG8HWK\nIECBNpPdSc5AK1i0SLfKoR/zVd/4NfTYjy3cZS8LcDZvH4kqTn0rI5MePa3Xh2uI\n2Q5dzbe7tUNh2UKNxocTOHUVnwtjnrwJbc21ds9FkSl4MxqHqSfauMt3fg+EpJU5\npzAwaOn3PDcDpV6IHeZpbCTeFb2EXmYmRS16cdCUt2SK0nRFQHwVzfLyAQt7SYWf\n6HmoSC/7AgMBAAECggEAXoCzGgAjqYsLLjZeq+25GNZCnDl5zOwS8ygtXFBkVFIC\n5FH8O7/trk7Ct9X8D0vQjVMYt7WPPLTEUY1lZ936R9CzYFflP1qEw6l0kwrT90nA\ndN5DLUVq5nxjkT6hZ/rneLgTzJdYRb2c54Qw3qoFhR9YSvyv8s0EBKLLQL/0jrDJ\nCj1ererZavTLCs1JdqKMMXM6iLxNqKcV8PSvYDUteHOMDWPvnR7c2OpFMdjIsf6q\nPj/2FeJaYsVIMSxH9qCIxdsNYBCoXa3luSb4m19ZG0ffEI/g8Wb8bpMI5K/2AGkg\nNiDXj0dMah+yYQLue3juVzCiC0yNkoJbXz1kOkb65QKBgQD8iImR++vonpcIZ7LB\nVWLagPjnYNK5KwFYyncowMYRqtpR+fTRg5uLAJGKjM7mIul8GZ9T4zhVCAswwyGS\nvHNrjBifTuf9IfhSTYaMqUeALOFtK0Q/W66373620zs6kWcuXJSkeThTYt7oGh7p\n5TS0KQp/lUF3tNPjmOuHx8J8lQKBgQDr4Gnup2beS7353wIPRx3SiD2qgR74zOPN\nSyudtlajLeVUge62mDjYGFXARKcDzymS7dGKawvfBzXbLS4GxxCPJybATxhlxw4x\n5gSzmvthT6lUDrhZiTyKfRFmhiUJmneG5ClxVF8I6YnYv83fuopD+5qY2RrNfF/y\nMeoOUKdGTwKBgDgL0YRtxdi1wc1ivmB8I9lcwGERsxLXgZAEN1f7GLp5EcUZ1YTe\nUZoTATofsBeRbgJV6W+DwU/V3i3vULcxTehzik9pAsHCVUtm21LCixTeYRWKgbYS\nEf/Ojm/jB4UjGiRG9dJe+OpAyjn2+h9s+Dp31VWleYcowdIEcVmMMxTVAoGAewpC\n99Sm2kpUPOVRY7rLGakr0actCseGBO6zP79/jftA50YnyWO6My7ufC7TmC8WFqir\nZzLTrHFMbJoyqiJoxuO7WRFpPp4JD4pW5YFwo6A0Sb6r9ziZNfxreTl8VHgY5Wpb\nG9zQ/gskdsYGlC/wM+opCJYnXw0D14il+PWlbA0CgYEA6/+ViLiGOp8za7dOD8/x\nk2IQqraaP1yZtmLvBzFbWwDTLacfFIew2vrShrG9mlEdebN7KZVwlzm+0fiwpvn1\n15rNc8mRi0v6rjKmVw900KnGjGykIz4VacAW09IGpAHJS0oTmiUH3+25or+6WGIA\nDJv9seflOFaN/FDAv/GLIM8=\n-----END PRIVATE KEY-----\n",
	client_email: "firebase-adminsdk-fbsvc@foundrscope.iam.gserviceaccount.com",
	client_id: "109898061616648867740",
	auth_uri: "https://accounts.google.com/o/oauth2/auth",
	token_uri: "https://oauth2.googleapis.com/token",
	auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
	client_x509_cert_url:
		"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40foundrscope.iam.gserviceaccount.com",
	universe_domain: "googleapis.com",
};
const app = initializeApp({
	credential: cert(serviceAccount),
});

export const auth = getAuth(app);

export async function verifyIdToken(accessToken) {
	try {
		if (accessToken.startsWith("Bearer "))
			accessToken = accessToken.slice(7, accessToken.length);
		return await auth.verifyIdToken(accessToken);
	} catch (error) {
		return null;
	}
}

export async function authenticate(req, res, next) {
	let accessToken = req.headers["authorization"];

	if (!accessToken) {
		res.status(401).send("Access Denied. No token provided.");
		return;
	}

	try {
		const decodedToken = await verifyIdToken(accessToken);

		if (!decodedToken) {
			throw new Error("Invalid token");
		}

		req.auth = {
			userId: decodedToken.uid,
			email: decodedToken.email,
			claims: {
				subscription: decodedToken.subscription || "canceled",
				plan: decodedToken.plan || null,
				hasUsedTrial: decodedToken.hasUsedTrial || false,
				stripeCustomerId: decodedToken.stripeCustomerId || null,
				hasPaymentMethod: decodedToken.hasPaymentMethod || false,
				paymentMethodAddedAt: decodedToken.paymentMethodAddedAt || null,
				cancel_at_period_end: decodedToken.cancel_at_period_end || false,
				current_period_end: decodedToken.current_period_end || null,
			},
		};

		next();
	} catch (error) {
		res.status(403).send("Access Denied. Invalid token");
	}
}

export async function requireActiveSubscription(req, res, next) {
	const status = req.auth.claims.subscription;
	if (status === "canceled") {
		return res.status(403).json({ error: "Subscription canceled" });
	}
	next();
}

export function requireRoles(roles) {
	return (req, res, next) => {
		if (req.customClaims && roles.some((role) => req.customClaims[role])) {
			next();
		} else {
			res
				.status(403)
				.send(
					"Access Denied. You need an active subscription to access this resource"
				);
		}
	};
}

export async function updateUserClaims(
	userId,
	subscriptionStatus,
	planType,
	hasUsedTrial = false,
	cancelSubscription = false
) {
	try {
		const claims = {
			subscription: subscriptionStatus,
			plan: planType,
			hasUsedTrial: hasUsedTrial,
		};

		if (cancelSubscription) {
			claims.canceled = true;
		}

		await auth.setCustomUserClaims(userId, claims);
		console.log(`Updated claims for user ${userId}:`, claims);
	} catch (error) {
		console.error("Error updating user claims:", error);
	}
}

export async function setUserClaims(uid, claims) {
	try {
		const currentClaims = await getUserClaims(uid);
		if (currentClaims) {
			claims = { ...currentClaims, ...claims };
		}

		await auth.setCustomUserClaims(uid, claims);
		console.log("Custom claims added to the user");
	} catch (error) {
		console.error("Error setting custom claims:", error);
	}
}

export async function getUserClaims(uid) {
	try {
		const user = await auth.getUser(uid);
		return user.customClaims;
	} catch (error) {
		console.log("Error fetching user data:", error);
		return null;
	}
}

//auth.getUser("NpgahA2TSIhpqbhkWf6vtAh7Sm12").then(console.log);
//auth.getUser("ihSlTyM07UZHgSDlVlSVivzDBZy1").then(console.log);
/*
setUserClaims("NpgahA2TSIhpqbhkWf6vtAh7Sm12", {
	hasUsedTrial: false,
});*/

//getUserClaims("NsAIAraFzFVMEo8kSdsTGRenMbD2").then(console.log);
/*setUserClaims("wSkWtP2Fq4Wixyq12Qdx9gAjMQU2", {
	plan: "Premium",
});
*/
