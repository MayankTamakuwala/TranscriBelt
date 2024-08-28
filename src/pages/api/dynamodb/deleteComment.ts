import { NextApiRequest, NextApiResponse } from "next";
import { DynamoDB } from "aws-sdk";

const dynamoDb = new DynamoDB.DocumentClient({
	region: process.env.AWS_REGION,
});

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== "DELETE") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	const { folderId, commentId } = req.query;

	if (
		!folderId ||
		!commentId ||
		typeof folderId !== "string" ||
		typeof commentId !== "string"
	) {
		return res
			.status(400)
			.json({ message: "Missing or invalid folderId or commentId" });
	}

	try {
		// First, get the current item
		const getParams = {
			TableName: process.env.DYNAMODB_TABLE_NAME!,
			Key: { folderID: folderId },
		};

		const currentItem = await dynamoDb.get(getParams).promise();

		if (!currentItem.Item) {
			return res.status(404).json({ message: "Folder not found" });
		}

		const currentComments = currentItem.Item.comments || [];

		// Filter out the comment to be deleted
		const updatedComments = currentComments.filter(
			(comment: any) => comment.commentId !== commentId
		);

		// Update the item with the new comments array
		const updateParams = {
			TableName: process.env.DYNAMODB_TABLE_NAME!,
			Key: { folderID: folderId },
			UpdateExpression: "SET comments = :newComments",
			ExpressionAttributeValues: {
				":newComments": updatedComments,
			},
			ReturnValues: "ALL_NEW",
		};

		const result = await dynamoDb.update(updateParams).promise();

		if (!result.Attributes) {
			return res.status(500).json({ message: "Failed to update comments" });
		}

		res.status(200).json({
			message: "Comment removed successfully",
			updatedComments: result.Attributes.comments,
		});
	} catch (error) {
		console.error("Error removing comment:", error);
		res.status(500).json({ message: "Error removing comment" });
	}
}
