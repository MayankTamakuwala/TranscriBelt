// src/pages/index.tsx
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload"
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from 'next/link';
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { Boxes } from "@/components/ui/background-boxes";

export default function Home() {
  const acceptedTypes = ["video/mp4", "video/avi", "video/mpeg", "video/webm"]
  const [video, setVideo] = useState<File[]>([])
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [resultData, setResultData] = useState<{
    folder_id: string;
  } | null>(null)

  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      addUserToDynamoDB(user);
    }
  }, [isLoaded, isSignedIn, user]);

  const addUserToDynamoDB = async (user: any) => {
    try {
      const response = await fetch('/api/dynamodb/addUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: `${user.firstName} ${user.lastName}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add user to DynamoDB');
      }

      console.log('User added to DynamoDB');
    } catch (error) {
      console.error('Error adding user to DynamoDB:', error);
      toast.error("Failed to sync user data");
    }
  };

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
    <div className="relative w-full overflow-hidden flex flex-col items-center justify-around h-screen bg-slate-950">
      <Boxes/>
      <SignedIn>
        <div className=" space-y-4  w-full h-full flex flex-col justify-around items-center">
          <FileUpload onChange={(e: File[]) => { setVideo(e) }} >
            {taskStatus && (
              <div className="z-50 mt-4">
                <p>Status: {taskStatus}</p>
                <p>Progress: {progress.toFixed(2)}%</p>
              </div>
            )}
            {resultData && (
              <div className="z-50 mt-4">
                <p>Processing completed!</p>
                <Link href={`/videos/${resultData.folder_id}`}>
                  <Button className="mt-2">
                    View Results
                  </Button>
                </Link>
              </div>
            )}
          </FileUpload>
          <Button onClick={handleSubmit} className="z-50 hover:text-white hover:shadow-2xl hover:shadow-cyan-500" disabled={taskStatus === 'Pending' || taskStatus === 'Processing'}>
            {taskStatus === 'Pending' || taskStatus === 'Processing' ? 'Processing...' : 'Send Video'}
          </Button>
        </div>
      </SignedIn>
      <SignedOut>
        <div className="z-10 space-y-4 text-center bg-muted p-4 rounded-md">
          <h1 className="text-2xl font-bold">Welcome to Video Processor</h1>
          <p>Please sign in or sign up to use the application.</p>
          <div className="space-x-4">
            <Link href="/sign-in">
              <Button>Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </SignedOut>
    </div>
  );
}