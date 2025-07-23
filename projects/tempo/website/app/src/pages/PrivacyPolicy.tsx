import React from 'react';
import SEO from '../components/SEO';

const PrivacyPolicy: React.FC = () => {

	return (
		<div className="min-h-screen flex flex-col bg-white">
			<SEO
				title='Privacy Policy for WebIndexer'
				description='Read the privacy policy for using the WebIndexer application.'
				keywords='webindexer, privacy policy, web crawling, chatbot, indexing, web indexing, web scraping, web indexer'
				canonicalUrl='/privacy-policy'
			/>
			<main className="flex-1 p-4 overflow-y-auto">
				<div className="max-w-3xl mx-auto">
					<h1 className="text-2xl font-bold mb-4">Privacy Policy for WebIndexer</h1>

					<div>
						<p className="mb-4">
							Last updated: 2024-10-08
						</p>

						<h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
						<p className="mb-4">
							Welcome to WebIndexer, a web crawling and indexing application designed to help websites implement intelligent chatbots. This Privacy Policy explains how we collect, use, and protect your information.
						</p>

						<h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
						<p className="mb-4">
							We collect the following types of information:
						</p>
						<ul className="list-disc pl-6 mb-4">
							<li>Website content: We crawl and index content from websites as authorized by our users</li>
							<li>Usage data: Information about how the service is used, including crawling patterns and chatbot interactions</li>
							<li>Account information: Basic information required for account creation and management</li>
						</ul>

						<h2 className="text-xl font-semibold mb-2">3. How We Use Your Information</h2>
						<p className="mb-4">
							We use the collected information for the following purposes:
						</p>
						<ul className="list-disc pl-6 mb-4">
							<li>To provide website indexing and chatbot services</li>
							<li>To improve our crawling algorithms and search functionality</li>
							<li>To enhance the accuracy and effectiveness of our chatbot responses</li>
							<li>To maintain and optimize our service performance</li>
						</ul>

						<h2 className="text-xl font-semibold mb-2">4. Data Protection</h2>
						<p className="mb-4">
							We take the security of your data seriously. All indexed content and user data are encrypted and stored securely. We implement industry-standard security measures to protect against unauthorized access, alteration, disclosure, or destruction of data.
						</p>

						<h2 className="text-xl font-semibold mb-2">5. Your Rights</h2>
						<p className="mb-4">
							You have the right to:
						</p>
						<ul className="list-disc pl-6 mb-4">
							<li>Access the data we have collected from your websites</li>
							<li>Request the deletion of your indexed content</li>
							<li>Modify crawling permissions and settings</li>
							<li>Export your indexed data</li>
						</ul>

						<h2 className="text-xl font-semibold mb-2">6. Data Deletion</h2>
						<p className="mb-4">
							If you wish to request the deletion of your data, please contact us at:
						</p>
						<p className="mb-4">
							<strong>Email:</strong> info@webindexer.app
						</p>
						<p className="mb-4">
							Once we receive your request, we will verify your identity and delete the requested data within 30 days, unless legal obligations require us to retain it for a longer period.
						</p>

						<h2 className="text-xl font-semibold mb-2">7. Data Retention</h2>
						<p className="mb-4">
							We retain indexed content and associated data for as long as necessary to provide our services or until you request its deletion. You can control the retention period through your account settings.
						</p>

						<h2 className="text-xl font-semibold mb-2">8. Changes to This Policy</h2>
						<p className="mb-4">
							We may update this privacy policy from time to time. We will notify you of any significant changes by email or through our platform.
						</p>

						<h2 className="text-xl font-semibold mb-2">9. Contact Us</h2>
						<p className="mb-4">
							If you have any questions about this Privacy Policy, please contact us at:
						</p>
						<p className="mb-4">
							WebIndexer<br />
							Email: info@webindexer.app<br />
						</p>
					</div>
				</div>
			</main>
		</div>
	);
};

export default PrivacyPolicy;