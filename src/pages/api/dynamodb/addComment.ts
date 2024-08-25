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
	if (req.method !== "POST") {
		return res.status(405).json({ message: "Method Not Allowed" });
	}

	const comment = req.body;

	if (!comment || !comment.folder_id || !comment.commentId) {
		return res.status(400).json({ message: "Invalid comment data" });
	}

	const tableName = process.env.DYNAMODB_TABLE_NAME;
	if (!tableName) {
		console.error("DYNAMODB_TABLE_NAME is not set");
		return res.status(500).json({ message: "Server configuration error" });
	}

	try {
		const params = {
			TableName: tableName,
			Key: { folderID: comment.folder_id },
			UpdateExpression:
				"SET comments = list_append(if_not_exists(comments, :empty_list), :comment)",
			ExpressionAttributeValues: {
				":comment": [comment],
				":empty_list": [],
			},
			ReturnValues: "UPDATED_NEW",
		};

		await dynamodb.update(params).promise();

		res.status(200).json({ message: "Comment added successfully" });
	} catch (error) {
		console.error("Error adding comment to DynamoDB:", error);
		res.status(500).json({ message: "Failed to add comment" });
	}
}
