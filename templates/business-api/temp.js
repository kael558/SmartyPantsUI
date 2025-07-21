/*import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import * as fs from "fs";
const unstructuredClient = new UnstructuredClient({
	security: {
		apiKeyAuth: "LGEXOgOrFtMsW896ux3rrD0Fp2p3TL",
	},
});

const fileName = "C:\\Users\\Rahel\\Desktop\\test_lwm.md";
const fileData = fs.readFileSync(fileName);

unstructuredClient.general
	.partition({
		partitionParameters: {
			files: {
				content: fileData,
				fileName: fileName,
			},
			strategy: Strategy.Auto,
			chunkingStrategy: "by_title",
			maxCharacters: 5000,
			includeOrigElements: false,
			combineUnderNChars: 0,
			multipageSections: true,
		},
	})
	.then((response) => {
		const text = response.map((item) => item.text);

		// write the data to a file
		fs.writeFileSync(
			"C:\\Users\\Rahel\\PycharmProjects\\WebIndexerApp\\business-api\\test_Title.json",
			JSON.stringify(text, null, 2)
		);
		console.log("Response: ", response);
		fs.writeFileSync(
			"C:\\Users\\Rahel\\PycharmProjects\\WebIndexerApp\\business-api\\response_Title.json",
			JSON.stringify(response, null, 2)
		);
	})
	.catch((error) => {
		console.error("Error: ", error);
	});

/*
import { Pinecone } from '@pinecone-database/pinecone';

(async () => {
	const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "test" });
	const index = pc.index("web-indexer");
	const projectId = "8ceda8f3-0bda-4046-ae44-7e76436c3f3f";
	const domain = "https://www.impaginationinc.com";


	const normalizedDomain = domain.replace(/^(https?:\/\/)/, '').replace(/^www\./, '');

	const formattedDomains = [`https://${normalizedDomain}`, `https://www.${normalizedDomain}`];

	for (const formattedDomain of formattedDomains) {
		// Also delete entries from Pinecone
		let paginationToken = null;
		while (true) {
			// fetch ids with listPaginated
			const params = {
				limit: 100,
				prefix: formattedDomain,
			}
			if (paginationToken) {
				params.paginationToken = paginationToken;
			}

			const results = await index.namespace(projectId).listPaginated(params);

			const vectorIds = results.vectors.map(vector => vector.id);
			console.log(`Found ${vectorIds.length} vectors with prefix ${formattedDomain}`);
			if (vectorIds.length == 0) {
				break;
			}

			await index.namespace(projectId).deleteMany(vectorIds);
			paginationToken = results.pagination?.next;

			if (!paginationToken) {
				break;
			}
		}
	}
})();*/
