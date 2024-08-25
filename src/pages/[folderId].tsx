import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import parse from 'html-react-parser'
import { Input } from "@/components/ui/input"
import { toast } from "react-hot-toast"
import { v4 as uuidv4 } from 'uuid'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { S3File, Comment } from '@/types'

export default function ResultPage() {
    const router = useRouter()
    const { folderId } = router.query
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [textContent, setTextContent] = useState<string | null>(null)
    const [summary, setSummary] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [selectedText, setSelectedText] = useState({ text: '', start: 0, end: 0 })
    const [newComment, setNewComment] = useState('')
    const textRef = useRef<HTMLPreElement>(null)

    useEffect(() => {
        const fetchData = async () => {
            if (folderId && typeof folderId === 'string') {
                try {
                    const response = await fetch(`/api/s3/listS3Contents?folderName=${encodeURIComponent(folderId)}`)
                    if (!response.ok) {
                        throw new Error('Failed to fetch S3 contents')
                    }
                    const data = await response.json()
                    const videoFile = data.files.find((file: S3File) => file.name.endsWith('.mp4'))
                    const textFile = data.files.find((file: S3File) => file.name.endsWith('.txt'))

                    if (videoFile) {
                        setVideoUrl(`/api/s3/getS3Video?folderId=${folderId}&fileName=${videoFile.name}`)
                    }

                    if (textFile) {
                        const textResponse = await fetch(`/api/s3/getS3Text?folderId=${folderId}&fileName=${textFile.name}`)
                        if (!textResponse.ok) {
                            throw new Error(`HTTP error! status: ${textResponse.status}`)
                        }
                        const text = await textResponse.text()
                        setTextContent(text)
                    }

                    // Fetch comments
                    await getComments()

                    setLoading(false)
                } catch (error) {
                    console.error('Error fetching data:', error)
                    setError('Failed to load data')
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
                const response = await fetch(`/api/dynamodb/getSummary?folderId=${folderId}`)
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

    const handleTextSelection = () => {
        const selection = window.getSelection()
        if (selection && selection.toString().length > 0) {
            const range = selection.getRangeAt(0)
            const start = range.startOffset
            const end = range.endOffset
            setSelectedText({ text: selection.toString(), start, end })
        }
    }

    const addComment = async () => {
        if (newComment && selectedText.text && folderId && typeof folderId === 'string') {
            const comment: Comment = {
                folder_id: folderId,
                commentId: uuidv4(),
                text: newComment,
                ref_text: {
                    startIndex: selectedText.start,
                    endIndex: selectedText.end,
                    text: selectedText.text
                },
                timestamp: new Date().toISOString(),
                edited: false
            }

            try {
                const response = await fetch('/api/dynamodb/addComment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(comment),
                })

                if (!response.ok) {
                    throw new Error('Failed to add comment')
                }

                setComments([...comments, comment])
                await getComments()
                setNewComment('')
                setSelectedText({ text: '', start: 0, end: 0 })
                toast.success("Your comment has been successfully added.")
            } catch (error) {
                console.error('Error adding comment:', error)
                toast.error("Failed to add comment. Please try again.")
            }
        }
    }

    const getComments = async () => {
        try{
            const commentsResponse = await fetch(`/api/dynamodb/getComments?folderId=${folderId}`)
            if (commentsResponse.ok) {
                const commentsData = await commentsResponse.json()
                setComments(commentsData.comments.sort((x: any, y: any) => {
                    x = new Date(x.timestamp),
                        y = new Date(y.timestamp);
                    return y - x;
                }))
            }
        } catch(e: any){
            console.error('Error fetching comments:', e)
            toast.error('Error Fetching Comments')
        }
    }

    const renderComments = () => {
        return comments.map((comment) => (
            <Card key={comment.commentId} className="mb-4">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">
                        <span className='underline'>Comment on:</span> <span className='italic'>{`${comment.ref_text.text}`}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{comment.text}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        {new Date(comment.timestamp).toLocaleString()}
                        {comment.edited && " (edited)"}
                    </p>
                </CardContent>
            </Card>
        ))
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
                        <video controls className="w-full rounded-md">
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
                            <TabsTrigger value="comments">Comments</TabsTrigger>
                        </TabsList>
                        <TabsContent value="extracted">
                            {textContent ? (
                                <div>
                                    <pre
                                        ref={textRef}
                                        className="bg-gray-100 p-4 rounded overflow-auto max-h-[calc(100vh-300px)]"
                                        onMouseUp={handleTextSelection}
                                    >
                                        {textContent}
                                    </pre>
                                    {selectedText.text && (
                                        <div className="mt-4">
                                            <Input
                                                placeholder="Type your comment here"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                className="mb-2"
                                                onKeyPress={(e) => {e.key === "Enter" ? addComment() : null}}
                                            />
                                            <Button onClick={addComment}>Add Comment</Button>
                                        </div>
                                    )}
                                </div>
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
                        <TabsContent value="comments">
                            <div className="overflow-auto max-h-[calc(100vh-300px)]">
                                {comments.length > 0 ? renderComments() : <div>No comments yet.</div>}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}