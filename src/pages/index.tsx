import { Boxes } from "@/components/ui/background-boxes";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload"
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from 'next/link';

// Mock data
const mockTaskId = "mock-task-123";
const mockFolderId = "test1";

// Function to simulate file upload
const simulateFileUpload = async (file: File): Promise<{ task_id: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Check if file type is accepted
  const acceptedTypes = ["video/mp4", "video/avi", "video/mpeg", "video/webm"];
  if (!acceptedTypes.includes(file.type)) {
    throw new Error("Not a Supported File Type");
  }

  return { task_id: mockTaskId };
};

// Function to simulate task status check
const simulateTaskStatus = async (taskId: string): Promise<{ status: string; progress: number; result_video_url?: string; result_txt_url?: string; folder_id?: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const progress = Math.random();
  if (progress < 0.3) {
    return { status: 'Pending', progress };
  } else if (progress < 0.9) {
    return { status: 'Processing', progress };
  } else {
    return {
      status: 'Completed',
      progress: 1,
      result_video_url: "https://rillajellybucket.s3.us-east-1.amazonaws.com/test1/videoplayback.mp4?response-content-disposition=inline&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEL3%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIFGpU8RJkU1GcNXylhxrEMENfoaiuPlsTi99aVsqK5q%2FAiA5cznVcc1ERPmSqug6%2FjD5JNd7om5Q2LJ6EEqZQQPQOyqeAgjF%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDEzNTgwODk0ODc2NiIMxDF3WhycgbaAUI4fKvIBDFnICmhwDwmGNrjO%2B1LLxcykWsWx06ZUgvm%2FApy%2F0zyjRvhortcQEQEyJymNhEK7y51AHRuxpcET%2Bgi7j6mld0Poibcpl5Uz62oE2G1HxrLnPbznyjKbUuj4X8KQ%2F2TTkOPxs4%2F7TVXrszOgLNID1C271OiSDq9I7lZuHmIdHXiT6KwzgPHV3LEpPfKU%2Bp5J5zI7WTybwlZPR7crrTl3d643UhDJF%2BxZlYs4Szzb9rccB8McaBvMK5Dn9MN9GIKPVyu21qxZIeq3OBRiEGIvtLvvf%2FJe%2F%2BtIHQgP80kHURckRGWI7boNqPexChVOgOy%2FmOswqLeotgY64AGWZ7SHhuefhGG76576ljE8PkRbZwyswnbt%2B%2BppTZVBV9kEBA71daKeMqg%2FwNGRbdKYurE%2F%2FXHrjo%2Bd7Jj9WgOAJ9lJ7NPYeuszQps0UBf73YBoCp5iG3HOpAi1G7lLEeD%2FgfDBNcYZOAsV%2Bk0D2okRDWK0cJlyTpvAZGekrKtdlAzQpEf%2F5vDTbDNeA9GhSf9vd%2B4mjU0bXebTbNnxH1ivTWYXu52H41sci1Cn9ZDiXCzuhWypD9VBwNBlVs1P%2F9lIq5cXaVi2l0u2LL02zvqRgztYSzHtJAduJckMHKnTcA%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20240824T215826Z&X-Amz-SignedHeaders=host&X-Amz-Expires=300&X-Amz-Credential=ASIAR7HWYDIPFZGFBQVY%2F20240824%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=1d6d94a3b999d9189a5d7956ab0b049d53558bdf96bb0019762b1680aff8a245",
      result_txt_url: "https://rillajellybucket.s3.us-east-1.amazonaws.com/test1/hello32.txt?response-content-disposition=inline&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEL3%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCIFGpU8RJkU1GcNXylhxrEMENfoaiuPlsTi99aVsqK5q%2FAiA5cznVcc1ERPmSqug6%2FjD5JNd7om5Q2LJ6EEqZQQPQOyqeAgjF%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDEzNTgwODk0ODc2NiIMxDF3WhycgbaAUI4fKvIBDFnICmhwDwmGNrjO%2B1LLxcykWsWx06ZUgvm%2FApy%2F0zyjRvhortcQEQEyJymNhEK7y51AHRuxpcET%2Bgi7j6mld0Poibcpl5Uz62oE2G1HxrLnPbznyjKbUuj4X8KQ%2F2TTkOPxs4%2F7TVXrszOgLNID1C271OiSDq9I7lZuHmIdHXiT6KwzgPHV3LEpPfKU%2Bp5J5zI7WTybwlZPR7crrTl3d643UhDJF%2BxZlYs4Szzb9rccB8McaBvMK5Dn9MN9GIKPVyu21qxZIeq3OBRiEGIvtLvvf%2FJe%2F%2BtIHQgP80kHURckRGWI7boNqPexChVOgOy%2FmOswqLeotgY64AGWZ7SHhuefhGG76576ljE8PkRbZwyswnbt%2B%2BppTZVBV9kEBA71daKeMqg%2FwNGRbdKYurE%2F%2FXHrjo%2Bd7Jj9WgOAJ9lJ7NPYeuszQps0UBf73YBoCp5iG3HOpAi1G7lLEeD%2FgfDBNcYZOAsV%2Bk0D2okRDWK0cJlyTpvAZGekrKtdlAzQpEf%2F5vDTbDNeA9GhSf9vd%2B4mjU0bXebTbNnxH1ivTWYXu52H41sci1Cn9ZDiXCzuhWypD9VBwNBlVs1P%2F9lIq5cXaVi2l0u2LL02zvqRgztYSzHtJAduJckMHKnTcA%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20240824T215800Z&X-Amz-SignedHeaders=host&X-Amz-Expires=300&X-Amz-Credential=ASIAR7HWYDIPFZGFBQVY%2F20240824%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=02dbee50b04902eb74139997b551888d669c2a153e6963f863b9c4896e99c7c4",
      folder_id: "test1"
    };
  }
};

export default function Home() {
  const [video, setVideo] = useState<File[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<{
    result_video_url: string;
    result_txt_url: string;
    folder_id: string;
  } | null>(null);

  const handleSubmit = async () => {
    try {
      if (video && video.length > 0) {
        const response = await simulateFileUpload(video[0]);
        setTaskId(response.task_id);
        setTaskStatus('Pending');
        setResultData(null);
        toast.success("Video upload simulated successfully");
      } else {
        toast.error("Please select a video file");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error uploading file");
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      if (taskId) {
        try {
          const data = await simulateTaskStatus(taskId);
          setTaskStatus(data.status);
          setProgress(data.progress * 100);

          if (data.status === 'Completed') {
            clearInterval(intervalId);
            setResultData({
              result_video_url: data.result_video_url!,
              result_txt_url: data.result_txt_url!,
              folder_id: data.folder_id!
            });
            toast.success("Video processing completed!");
          }
        } catch (error) {
          console.error('Error checking task status:', error);
          clearInterval(intervalId);
          toast.error("Error checking task status");
        }
      }
    };

    if (taskId) {
      intervalId = setInterval(checkStatus, 2000); // Check every 2 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [taskId]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between">
      <div className="relative w-full overflow-hidden flex flex-col items-center justify-around h-screen">
        <Boxes />
        <FileUpload onChange={(e: File[]) => { setVideo(e); console.log(e[0].type); }} />
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

// Original code (commented out):
/*
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
            result_video_url: data.result_video_url,
            result_txt_url: data.result_txt_url,
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
*/