import { Boxes } from "@/components/ui/background-boxes";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload"
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from 'next/link';

export default function Home() {
  const acceptedTypes = ["video/mp4", "video/avi", "video/mpeg", "video/webm"]
  const [video, setVideo] = useState<File[]>([])
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [resultData, setResultData] = useState<{
    folder_id: string;
  } | null>(null)

  const handleSubmit = async () => {
    try {
      if (video && acceptedTypes.includes(video[0].type)) {
        const form = new FormData()
        form.append('file', video[0])
        const response = await fetch('http://localhost:8000/upload', {
          method: 'POST',
          body: form
        })
        const data = await response.json()
        setTaskId(data.task_id)
        setTaskStatus('Pending')
        setResultData(null) // Reset result data when starting a new task
      } else {
        toast.error("Not a Supported File Type")
      }
    } catch (e: any) {
      console.error(e)
      toast.error("Error Uploading File")
    }
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      if (taskId) {
        try {
          const response = await fetch(`http://localhost:8000/status/${taskId}`)
          const data = await response.json()
          setTaskStatus(data.status)
          setProgress(data.progress * 100)

          if (data.status === 'Completed') {
            clearInterval(intervalId)
            setResultData({
              folder_id: data.folder_id
            })
            toast.success("Video processing completed!")
          } else if (data.status === 'Error') {
            clearInterval(intervalId)
            toast.error("Error processing video")
          }
        } catch (error) {
          console.error('Error checking task status:', error)
        }
      }
    }

    if (taskId) {
      intervalId = setInterval(checkStatus, 5000) // Check every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [taskId])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between">
      <div className="relative w-full overflow-hidden flex flex-col items-center justify-around h-screen">
        <Boxes />
        <FileUpload onChange={(e: File[]) => { setVideo(e) }} />
        <Button onClick={handleSubmit} className="z-50" disabled={taskStatus === 'Pending' || taskStatus === 'Processing'}>
          {taskStatus === 'Pending' || taskStatus === 'Processing' ? 'Processing...' : 'Send Video'}
        </Button>
        {taskStatus && (
          <div className="z-50 mt-4">
            <p>Status: {taskStatus}</p>
            <p>Progress: {progress.toFixed(2)}%</p>
          </div>
        )}
        {resultData && (
          <div className="z-50 mt-4">
            <p>Processing completed!</p>
            <Link href={`/${resultData.folder_id}`}>
              <Button className="mt-2">
                View Results
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}