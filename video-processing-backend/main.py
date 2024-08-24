import os
import tempfile
from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
from moviepy.editor import VideoFileClip, AudioFileClip, CompositeVideoClip
import cv2
import whisper
import aiofiles
import logging
import json
import ffmpeg
import uuid
from datetime import timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProcessingStatus(BaseModel):
    status: str
    progress: float = 0
    result_url: Optional[str] = None
        

processing_statuses = {}

def update_status(task_id: str, status: str, progress: float, result_url: Optional[str] = None):
    processing_statuses[task_id] = ProcessingStatus(status=status, progress=progress, result_url=result_url)

async def process_video_task(video_path: str, task_id: str):
    try:
        audio_path = await extract_audio(video_path)
        update_status(task_id, "Extracted audio", 0.2)

        transcript = await generate_transcript(audio_path)
        update_status(task_id, "Transcribed", 0.5)
        # with open('test.json', 'r') as f:
        #     transcript = json.load(f)

        srt_content = generate_srt(transcript)
        update_status(task_id, "SubRip Subtitle Made", 0.8)

        final_video = await add_captions_to_video("./videoplayback.mp4", transcript, audio_path)
        update_status(task_id, "Completed", 1.0, f"/download/{os.path.basename(final_video)}")
        
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        update_status(task_id, f"Error: {str(e)}", 1.0)

async def extract_audio(video_path: str) -> str:
    video = VideoFileClip(video_path)
    audio_path = tempfile.mktemp(suffix='.wav')
    video.audio.write_audiofile(audio_path)
    return audio_path

async def generate_transcript(audio_path: str):
    model = whisper.load_model("base")
    try:
        result = model.transcribe(audio_path, word_timestamps=True)
        return result
    except e:
        raise ValueError(f"Could not request results from Speech Recognition service: {e}")

def get_optimal_font_scale(text: str, width: int) -> float:
    for scale in reversed(range(0, 60, 1)):
        textSize = cv2.getTextSize(text, fontFace=cv2.FONT_HERSHEY_DUPLEX, fontScale=scale/10, thickness=1)
        new_width = textSize[0][0]
        if (new_width <= width):
            return scale/10
    return 1

async def add_captions_to_video(video_path: str, transcription: object, audio_path: str) -> str:
    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    output_path = video_path.rsplit('.', 1)[0] + '_captioned.mp4'
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    frame_count = 0
    current_segment_index = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        current_time = frame_count / fps
        
        if current_segment_index < len(transcription['segments']):
            segment = transcription['segments'][current_segment_index]
            if segment['start'] <= current_time < segment['end']:
                text = segment['text']
                font_scale = get_optimal_font_scale(text, width)
                
                # Calculate the total width of the text
                (total_width, text_height), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_DUPLEX, font_scale, 1)
                text_x = (width - total_width) // 2
                text_y = height - 50

                # Draw background rectangle
                cv2.rectangle(frame, (text_x - 10, text_y - text_height - 10),
                              (text_x + total_width + 10, text_y + 10), (0, 0, 0), -1)
                
                # Draw words with highlighting
                x = text_x
                for word in segment['words']:
                    word_text = word['word']
                    (word_width, _), _ = cv2.getTextSize(word_text, cv2.FONT_HERSHEY_DUPLEX, font_scale, 1)
                    
                    if word['start'] <= current_time < word['end']:
                        cv2.putText(frame, word_text, (x, text_y), cv2.FONT_HERSHEY_DUPLEX,
                                    font_scale, (255, 255, 0), 1, cv2.LINE_AA)
                    else:
                        cv2.putText(frame, word_text, (x, text_y), cv2.FONT_HERSHEY_DUPLEX,
                                    font_scale, (255, 255, 255), 1, cv2.LINE_AA)
                    
                    x += word_width + 5  # Add a small space between words
                
            elif current_time >= segment['end']:
                current_segment_index += 1
        
        out.write(frame)
        frame_count += 1
    
    cap.release()
    out.release()

    input_video = ffmpeg.input(output_path)
    input_audio = ffmpeg.input(audio_path)
    uid = uuid.uuid4()
    final_output_path = f"{video_path.rsplit('.', 1)[0]}_captioned_with_audio_{uid}.mp4"
    ffmpeg.concat(input_video, input_audio, v=1, a=1).output(final_output_path).run(overwrite_output=True)

    os.remove(output_path)
    os.remove(audio_path)

    return final_output_path

def timedelta_to_srt_time(td):
    """Convert a timedelta to SRT time format (HH:MM:SS,mmm)"""
    total_seconds = int(td.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = int(td.microseconds / 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def generate_srt(transcription_data):
    srt_content = ""
    for i, segment in enumerate(transcription_data['segments'], start=1):
        start_time = timedelta(seconds=segment['start'])
        end_time = timedelta(seconds=segment['end'])
        
        srt_content += f"{i}\n"
        srt_content += f"{timedelta_to_srt_time(start_time)} --> {timedelta_to_srt_time(end_time)}\n"
        srt_content += f"{segment['text'].strip()}\n\n"
    
    return srt_content

@app.post("/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        temp_file = tempfile.mktemp(suffix='.mp4')
        async with aiofiles.open(temp_file, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        task_id = f"task_{len(processing_statuses) + 1}"

        background_tasks.add_task(process_video_task, temp_file, task_id)

        return {"task_id": task_id, "message": "Video upload successful. Processing started."}
    except Exception as e:
        logger.error(f"Error uploading video: {str(e)}")
        return {"error": str(e)}

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    if task_id in processing_statuses:
        return processing_statuses[task_id]
    return {"error": "Task not found"}

@app.get("/download/{filename}")
async def download_video(filename: str):
    file_path = os.path.join(tempfile.gettempdir(), filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="video/mp4", filename=filename)
    return {"error": "File not found"}
