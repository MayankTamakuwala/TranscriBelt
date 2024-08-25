export interface S3File {
	name: string;
	path: string;
	size: number;
	lastModified: string;
}

export interface Comment {
	folder_id: string;
	commentId: string;
	text: string;
	ref_text: {
		startIndex: number;
		endIndex: number;
		text: string;
	};
	timestamp: string;
	edited: boolean;
}