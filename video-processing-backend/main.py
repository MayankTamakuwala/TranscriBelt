import os
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Depends
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import logging
import json
import time
from celery.result import AsyncResult
from tasks import process_video_task  # Import the Celery task
import redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis client for caching and rate limiting
redis_client = redis.Redis(host='localhost', port=6379, db=0)

class ProcessingStatus(BaseModel):
    """
    Represents the status of a video processing task.

    Attributes:
        status (str): The current status of the task (e.g. "Pending", "Processing", "Error", etc.)
        progress (float): The progress of the task as a float between 0 and 1.
        result_url (Optional[str]): The URL of the processed video if the task is complete.
    """
    status: str
    progress: float = 0
    result_url: Optional[str] = None

async def rate_limit(request: Request, times: int = 10, seconds: int = 60):
    client_ip = request.client.host
    key = f"ratelimit:{client_ip}:upload"
    current = redis_client.get(key)
    
    if current is not None and int(current) >= times:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, seconds)
    pipe.execute()

@app.post("/upload")
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    rate_limiter: None = Depends(rate_limit)
):
    """
    Upload a video file for processing.
    Args:
    file (UploadFile): The video file to upload.
    Returns:
    A JSON response with the task ID and a message indicating that the video upload was successful.
    """
    try:
        # Log request details
        logger.info(f"Received upload request. Content-Type: {request.headers.get('content-type')}")
        logger.info(f"File details - Filename: {file.filename}, Content-Type: {file.content_type}")

        # Ensure the file is a video
        if not file.content_type.startswith('video/'):
            raise HTTPException(status_code=400, detail="File must be a video")

        # Create a temporary file
        temp_file = tempfile.mktemp(suffix='.mp4')
        with open(temp_file, 'wb') as out_file:
            # Read the file in chunks
            chunk_size = 1024 * 1024  # 1 MB chunks
            while content := await file.read(chunk_size):
                out_file.write(content)

        logger.info(f"File successfully uploaded and saved as {temp_file}")

        # Start the Celery task
        task = process_video_task.delay(temp_file)
        logger.info(f"Celery task started with ID: {task.id}")

        return JSONResponse(content={
            "task_id": task.id,
            "message": "Video upload successful. Processing started.",
            "filename": file.filename,
            "temp_file_path": temp_file
        }, status_code=200)

    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Error uploading video: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    """
    Get the status of a video processing task.

    Args:
        task_id (str): The ID of the task to get the status for.

    Returns:
        A JSON response with the status of the task.

    Example:
        ```bash
        curl -X GET \
        http://localhost:8000/status/1234567890
        ```
    """
    # Try to get status from cache
    cached_status = redis_client.get(f"status:{task_id}")
    if cached_status:
        return json.loads(cached_status)
    
    task_result = AsyncResult(task_id)
    if task_result.state == 'PENDING':
        status = {'status': 'Pending', 'progress': 0}
    elif task_result.state != 'FAILURE':
        status = task_result.info
    else:
        status = {'status': 'Error', 'progress': 1.0, 'error': str(task_result.result)}
    
    # Cache the status for 5 seconds
    redis_client.setex(f"status:{task_id}", 5, json.dumps(status))
    return status

@app.get("/download/{filename}")
async def download_video(filename: str):
    """
    Download a video file from the temporary directory.

    Args:
    - filename (str): The name of the video file to download.

    Returns:
    - FileResponse: A response containing the video file.

    Raises:
    - HTTPException: If the file does not exist.
    """
    file_path = os.path.join(tempfile.gettempdir(), filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="video/mp4", filename=filename)
    raise HTTPException(status_code=404, detail="File not found")
