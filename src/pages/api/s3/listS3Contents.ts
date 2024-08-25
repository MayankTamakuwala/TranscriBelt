import { NextApiRequest, NextApiResponse } from "next";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Configure the S3 client
const s3Client = new S3Client({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	// Only allow GET requests
	if (req.method !== "GET") {
		return res.status(405).json({ message: "Method Not Allowed" });
	}

	let { folderName } = req.query;

	if (!folderName || typeof folderName !== "string") {
		return res
			.status(400)
			.json({ message: "Folder name is required and must be a string" });
	}

	// Ensure the folder name ends with a '/'
	folderName = folderName.trim();
	if (!folderName.endsWith("/")) {
		folderName += "/";
	}

	try {
		const command = new ListObjectsV2Command({
			Bucket: process.env.S3_BUCKET_NAME,
			Prefix: folderName,
		});

		const response = await s3Client.send(command);

		const files =
			response.Contents?.filter(
				(item) => item.Key !== folderName && !item.Key?.endsWith("/")
			).map((item) => {
				const fullPath = item.Key?.slice(folderName.length);
				return {
					name: fullPath?.split("/").pop() || "",
					path: fullPath || "",
					size: item.Size,
					lastModified: item.LastModified,
				};
			}) || [];

		res.status(200).json({ files });
	} catch (error) {
		console.error("Error listing S3 contents:", error);
		res.status(500).json({
			message: "Error listing S3 contents",
			error: (error as Error).message,
		});
	}
}
