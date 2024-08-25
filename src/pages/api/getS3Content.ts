import { NextApiRequest, NextApiResponse } from "next";
import AWS from "aws-sdk";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { folderId, fileName } = req.query;

	if (
		!folderId ||
		!fileName ||
		Array.isArray(folderId) ||
		Array.isArray(fileName)
	) {
		return res.status(400).json({ error: "Invalid folderId or fileName" });
	}

	if (!process.env.S3_BUCKET_NAME) {
		return res.status(500).json({ error: "S3 bucket name is not configured" });
	}

	const s3 = new AWS.S3({
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		region: process.env.AWS_REGION,
	});

	const params: AWS.S3.GetObjectRequest = {
		Bucket: process.env.S3_BUCKET_NAME,
		Key: `${folderId}/${fileName}`,
	};

	try {
		const data = await s3.getObject(params).promise();
		res.status(200).send(data.Body);
	} catch (error) {
		console.error("Error fetching from S3:", error);
		res.status(500).json({ error: "Error fetching from S3" });
	}
}
