import { NextApiRequest, NextApiResponse } from "next";
import AWS from "aws-sdk";

AWS.config.update({
	region: process.env.AWS_REGION,
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method === "POST") {
		const { userId, email, name } = req.body;

		const params = {
			TableName: "users", // Replace with your DynamoDB table name
			Item: {
				userID: userId,
				email,
				name,
				createdAt: new Date().toISOString(),
			},
		};

		try {
			await dynamoDB.put(params).promise();
			res.status(200).json({ message: "User added successfully" });
		} catch (error) {
			console.error("Error adding user to DynamoDB:", error);
			res.status(500).json({ error: "Failed to add user" });
		}
	} else {
		res.setHeader("Allow", ["POST"]);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}
