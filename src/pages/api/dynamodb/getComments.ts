import { NextApiRequest, NextApiResponse } from "next";
import { DynamoDB } from "aws-sdk";

const dynamodb = new DynamoDB.DocumentClient({
	region: process.env.AWS_REGION,
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

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
		const params = {
			TableName: tableName,
			Key: { folderID: folderId },
			ProjectionExpression: "comments",
		};

		const result = await dynamodb.get(params).promise();

		const comments = result.Item?.comments || [];

		res.status(200).json({ comments });
	} catch (error) {
		console.error("Error fetching comments from DynamoDB:", error);
		res.status(500).json({ message: "Failed to fetch comments" });
	}
}
