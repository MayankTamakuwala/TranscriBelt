// pages/api/dynamodb/editComment.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { DynamoDB } from "aws-sdk";

const dynamoDB = new DynamoDB.DocumentClient({
	region: process.env.AWS_REGION,
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== "PUT") {
		return res.status(405).json({ message: "Method Not Allowed" });
	}

	const { folderId, commentId, editedText } = req.body;

	if (!folderId || !commentId || !editedText) {
		return res.status(400).json({ message: "Missing required fields" });
	}

	try {
		// First, get the current document
		const getParams = {
			TableName: process.env.DYNAMODB_TABLE_NAME as string,
			Key: {
				folderID: folderId,
			},
		};

		const getResult = await dynamoDB.get(getParams).promise();
		const comments = getResult.Item?.comments || [];

		// Find the index of the comment
		const commentIndex = comments.findIndex(
			(comment: any) => comment.commentId === commentId
		);

		if (commentIndex === -1) {
			return res.status(404).json({ message: "Comment not found" });
		}

		// Now update the specific comment
		const updateParams = {
			TableName: process.env.DYNAMODB_TABLE_NAME as string,
			Key: {
				folderID: folderId,
			},
			UpdateExpression: `SET comments[${commentIndex}].#text = :editedText, 
                         comments[${commentIndex}].#edited = :edited, 
                         comments[${commentIndex}].updatedAt = :updatedAt`,
			ExpressionAttributeNames: {
				"#text": "text",
				"#edited": "edited",
			},
			ExpressionAttributeValues: {
				":editedText": editedText,
				":edited": true,
				":updatedAt": new Date().toISOString(),
			},
			ReturnValues: "ALL_NEW",
		};

		const result = await dynamoDB.update(updateParams).promise();

		res
			.status(200)
			.json({
				message: "Comment updated successfully",
				updatedComment: result.Attributes,
			});
	} catch (error: any) {
		console.error("Error updating comment:", error);
		res
			.status(500)
			.json({ message: "Internal Server Error", error: error.message });
	}
}
