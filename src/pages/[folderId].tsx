import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button";
import Link from 'next/link';

interface S3File {
    name: string;
    path: string;
    size: number;
    lastModified: string;
}

export default function ResultPage() {
    const router = useRouter()
    const { folderId } = router.query
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [textContent, setTextContent] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            if (folderId) {
                try {
                    // Fetch result data from your backend API
                    const response = await fetch(`/api/listS3Contents?folderName=${encodeURIComponent(folderId as string)}`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch S3 contents');
                    }
                    const data = await response.json();

                    // Find video and text files
                    const videoFile = data.files.find((file: S3File) => file.name.endsWith('.mp4'));
                    const textFile = data.files.find((file: S3File) => file.name.endsWith('.txt'));

                    if (videoFile) {
                        // Set video URL
                        setVideoUrl(`/api/getS3Video?folderId=${folderId}&fileName=${videoFile.name}`);
                    }

                    if (textFile) {
                        // Fetch text content
                        const textResponse = await fetch(`/api/getS3Text?folderId=${folderId}&fileName=${textFile.name}`);
                        if (!textResponse.ok) {
                            throw new Error(`HTTP error! status: ${textResponse.status}`);
                        }
                        const text = await textResponse.text();
                        setTextContent(text);
                    }

                    setLoading(false);
                } catch (error) {
                    console.error('Error fetching result data:', error);
                    setError('Failed to load result data');
                    setLoading(false);
                }
            }
        }
        fetchData();
    }, [folderId]);

    if (loading) {
        return <div>Loading...</div>
    }

    if (error) {
        return <div>Error: {error}</div>
    }

    return (
        <div className="container mx-auto py-8 flex flex-col">
            <h1 className="text-2xl font-bold mb-4">Result for Folder ID: {folderId}</h1>
            <div className='justify-between items-center flex-wrap flex-col lg:flex-row'>
                {videoUrl && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-2">Processed Video</h2>
                        <video controls className="w-full max-w-3xl mx-auto">
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                )}
                {textContent && (
                    <div className="mb-8 sm:mx-5 md:mx-0">
                        <h2 className="text-xl font-semibold mb-2">Extracted Text</h2>
                        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                            {textContent}
                        </pre>
                    </div>
                )}
            </div>
            <Link href="/">
                <Button>Back to Home</Button>
            </Link>
        </div>
    )
}