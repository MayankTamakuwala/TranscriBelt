import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button";
import Link from 'next/link';

// Mock data
const mockResultData = {
    result_video_url: "videoplayback.mp4",
    result_txt_url: "hello32.txt",
    folder_id: "test1"
};

// Function to simulate API call
const fetchMockData = async (folderId: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (folderId === mockResultData.folder_id) {
        return mockResultData;
    } else {
        throw new Error("Folder not found");
    }
};

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
                    const data = await fetchMockData(folderId as string);

                    // Set video URL to our new API route
                    setVideoUrl(`/api/getS3Video?folderId=${data.folder_id}&fileName=${data.result_video_url}`);

                    // Fetch text content from our API route
                    const response = await fetch(`/api/getS3Content?folderId=${data.folder_id}&fileName=${data.result_txt_url}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const text = await response.text();
                    setTextContent(text);

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


    useEffect(() => {
        console.log(videoUrl)
        console.log(textContent)
    }, [videoUrl, textContent])

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
                    <div className="mb-8 sm:mx-5 md:mx-0    ">
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

// Original code (commented out):
/*
useEffect(() => {
  const fetchData = async () => {
    if (folderId) {
      try {
        // Replace this with your actual API endpoint
        const response = await fetch(`http://localhost:8000/result/${folderId}`)
        const data = await response.json()
        setVideoUrl(data.result_video_url)
        
        // Fetch text content
        const textResponse = await fetch(data.result_txt_url)
        const textData = await textResponse.text()
        setTextContent(textData)
        
        setLoading(false)
      } catch (error) {
        console.error('Error fetching result data:', error)
        setError('Failed to load result data')
        setLoading(false)
      }
    }
  }

  fetchData()
}, [folderId])
*/