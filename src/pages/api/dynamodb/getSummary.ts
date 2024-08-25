import { NextApiRequest, NextApiResponse } from "next";
import { DynamoDB } from "aws-sdk";

// Initialize the DynamoDB client
const dynamodb = new DynamoDB.DocumentClient({
	region: process.env.AWS_REGION,
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

function formatSummary(text: string): string {
	// Convert **text** to <strong>text</strong>
	text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

	// Convert lines starting with * to list items
	const lines = text.split("\n");
	let inList = false;
	const formattedLines = lines.map((line) => {
		if (line.trim().startsWith("*")) {
			if (!inList) {
				inList = true;
				return "<ul className='list list-disc ml-8'><li>" + line.trim().substring(1).trim() + "</li>";
			} else {
				return "<li>" + line.trim().substring(1).trim() + "</li>";
			}
		} else {
			if (inList) {
				inList = false;
				return "</ul>" + line;
			} else {
				return line;
			}
		}
	});

	// Close the list if it's still open
	if (inList) {
		formattedLines.push("</ul>");
	}

	return formattedLines.join("\n");
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== "GET") {
		return res.status(405).json({ message: "Method Not Allowed" });
	}

	const { folderId } = req.query;

	if (!folderId || typeof folderId !== "string") {
		return res.status(400).json({ message: "Missing or invalid folderId" });
	}

	const tableName = process.env.DYNAMODB_TABLE_NAME;
	if (!tableName) {
		console.error("DYNAMODB_TABLE_NAME is not set");
		return res.status(500).json({ message: "Server configuration error" });
	}

	try {
		const params: DynamoDB.DocumentClient.GetItemInput = {
			TableName: tableName,
			Key: {
				folderID: folderId,
			},
		};

		const result = await dynamodb.get(params).promise();

		if (!result.Item) {
			return res.status(404).json({ message: "Summary not found" });
		}

		const summary = result.Item.summary;
		const formattedSummary = formatSummary(summary);

		res.status(200).json({ summary: formattedSummary });
	} catch (error) {
		console.error("Error fetching summary from DynamoDB:", error);
		if (error instanceof Error) {
			res
				.status(500)
				.json({ message: "Internal Server Error", error: error.message });
		} else {
			res.status(500).json({ message: "Internal Server Error" });
		}
	}
}
