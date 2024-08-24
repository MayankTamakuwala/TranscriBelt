import { Boxes } from "@/components/ui/background-boxes";
import { Button } from "@/components/ui/button";
import {FileUpload} from "@/components/ui/file-upload"
import { useState } from "react";
import toast from "react-hot-toast";

export default function Home() {
  const acceptedTypes = ["video/mp4", "video/avi", "video/mpeg", "video/webm"]
  const [video, setVideo] = useState<File[]>([])

  const handleSubmit = async() => {
    if (video && acceptedTypes.includes(video[0].type)){
      const form = new FormData()
      form.append('file', video[0])
      await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: form
      })
    } else {
      toast.error("Not a Supported File Type")
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between">
      <div className="relative w-full overflow-hidden flex flex-col items-center justify-around h-screen">
        <Boxes />
        <FileUpload onChange={(e: File[]) => { setVideo(e); console.log(e[0].type) }} />
        <Button onClick={handleSubmit} className="z-50">Send Video</Button>
      </div>
    </main>
  );
}
