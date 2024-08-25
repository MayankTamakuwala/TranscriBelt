import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import parse from 'html-react-parser';

interface S3File {
    name: string
    path: string
    size: number
    lastModified: string
}

export default function ResultPage() {
    const router = useRouter()
    const { folderId } = router.query
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [textContent, setTextContent] = useState<string | null>(null)
    const [summary, setSummary] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            if (folderId) {
                try {
                    const response = await fetch(`/api/listS3Contents?folderName=${encodeURIComponent(folderId as string)}`)
                    if (!response.ok) {
                        throw new Error('Failed to fetch S3 contents')
                    }
                    const data = await response.json()
                    const videoFile = data.files.find((file: S3File) => file.name.endsWith('.mp4'))
                    const textFile = data.files.find((file: S3File) => file.name.endsWith('.txt'))

                    if (videoFile) {
                        setVideoUrl(`/api/getS3Video?folderId=${folderId}&fileName=${videoFile.name}`)
                    }

                    if (textFile) {
                        const textResponse = await fetch(`/api/getS3Text?folderId=${folderId}&fileName=${textFile.name}`)
                        if (!textResponse.ok) {
                            throw new Error(`HTTP error! status: ${textResponse.status}`)
                        }
                        const text = await textResponse.text()
                        setTextContent(text)
                    }

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

    const fetchSummary = async () => {
        if (folderId && !summary) {
            setSummaryLoading(true)
            try {
                const response = await fetch(`/api/getSummary?folderId=${folderId}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch summary')
                }
                const data = await response.json()
                setSummary(data.summary)
            } catch (error) {
                console.error('Error fetching summary:', error)
                setError('Failed to load summary')
            } finally {
                setSummaryLoading(false)
            }
        }
    }

    if (loading) {
        return <div>Loading...</div>
    }

    if (error) {
        return <div>Error: {error}</div>
    }

    return (
        <div className="container mx-auto py-8 flex flex-col">
            <Link href="/">
                <Button>Back to Home</Button>
            </Link>
            <h1 className="text-2xl font-bold mb-4">Result for Folder ID: {folderId}</h1>
            <div className="flex flex-col lg:flex-row lg:space-x-8">
                {videoUrl && (
                    <div className="mb-8 lg:w-1/2">
                        <h2 className="text-xl font-semibold mb-2">Processed Video</h2>
                        <video controls className="w-full">
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                )}
                <div className="mb-8 lg:w-1/2">
                    <h2 className="text-xl font-semibold mb-2">Text Content</h2>
                    <Tabs defaultValue="extracted" onValueChange={(value) => {
                        if (value === "summary") {
                            fetchSummary()
                        }
                    }}>
                        <TabsList>
                            <TabsTrigger value="extracted">Extracted Text</TabsTrigger>
                            <TabsTrigger value="summary">Summarize</TabsTrigger>
                        </TabsList>
                        <TabsContent value="extracted">
                            {textContent ? (
                                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[calc(100vh-300px)]">
                                    {textContent}
                                </pre>
                            ) : (
                                <div>No extracted text available.</div>
                            )}
                        </TabsContent>
                        <TabsContent value="summary">
                            {summaryLoading ? (
                                <div className="flex justify-center items-center h-[calc(100vh-300px)]">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : summary ? (
                                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[calc(100vh-300px)] text-wrap">
                                    <div>{parse(summary)}</div>
                                </pre>
                            ) : (
                                <div>No summary available.</div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}