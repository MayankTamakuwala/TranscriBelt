import logging
from celery import Celery
from moviepy.editor import VideoFileClip, AudioFileClip, CompositeVideoClip
import whisper
import cv2
import os
import tempfile
import ffmpeg
import uuid
import torch
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError
from datetime import timedelta
import torch
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()
s3obj = boto3.client("s3", aws_access_key_id = os.environ.get("AWS_ACCESS_KEY_ID"),
                     aws_secret_access_key = os.environ.get("AWS_SECRET_ACCESS_KEY"),
                     region_name = os.environ.get("AWS_REGION"))

celery_app = Celery('tasks', broker='redis://localhost:6379', backend='redis://localhost:6379')

@celery_app.task(bind=True)
def process_video_task(self, video_path: str):
    """
    Process a video file by extracting audio, generating a transcript, creating an SRT file, and adding captions to the video.

    Args:
        video_path (str): The path to the video file to be processed.

    Returns:
        dict: A dictionary containing the status of the task, progress, and the URL of the final video.

    Example:
        >>> process_video_task.apply_async(args=['path/to/video.mp4'])
    """
    logger.info(f"Starting video processing task for {video_path}")
    try:
        audio_path = extract_audio(video_path)
        self.update_state(state='PROGRESS', meta={'status': 'Extracted audio', 'progress': 0.2})
        logger.info("Audio extraction completed")

        transcript = generate_transcript(audio_path)
        self.update_state(state='PROGRESS', meta={'status': 'Transcribed', 'progress': 0.5})
        logger.info("Transcription completed")

        srt_content = generate_srt(transcript)
        self.update_state(state='PROGRESS', meta={'status': 'SubRip Subtitle Made', 'progress': 0.8})
        logger.info("SRT file generation completed")


        final_video = add_captions_to_video(video_path, transcript, audio_path)
        logger.info(f"Video processing completed. Final video: {final_video}")

        transcriptfile = create_srt_file(os.path.basename(final_video), srt_content)
        folder_id = uuid.uuid4()
        file_upload_to_s3(transcriptfile, os.environ.get("S3_BUCKET_NAME"), f"{folder_id}/{os.path.basename(transcriptfile)}")
        file_upload_to_s3(final_video, os.environ.get("S3_BUCKET_NAME"), f"{folder_id}/{os.path.basename(final_video)}")

        file1 = os.path.basename(final_video)
        file2 = os.path.basename(transcriptfile)
        os.remove(transcriptfile)
        return {'status': 'Completed', 'progress': 1.0, 'result_video_url': f"{file1}", 'result_txt_url': f"{file2}", 'folder_id': f"{folder_id}"}
    
    except Exception as e:
        logger.error(f"Error in video processing task: {str(e)}", exc_info=True)
        return {'status': f"Error: {str(e)}", 'progress': 1.0}

def extract_audio(video_path: str) -> str:
    """
    Extract audio from a video file.

    Args:
        video_path (str): The path to the video file.

    Returns:
        str: The path to the extracted audio file.

    Example:
        >>> audio_path = extract_audio('path/to/video.mp4')
    """
    logger.info(f"Starting audio extraction from {video_path}")
    video = VideoFileClip(video_path)
    audio_path = tempfile.mktemp(suffix='.wav')
    video.audio.write_audiofile(audio_path)
    logger.info(f"Audio extracted to {audio_path}")
    return audio_path

def timedelta_to_srt_time(td):
    """
    Convert a timedelta object to an SRT time string.

    Args:
        td (timedelta): The timedelta object to convert.

    Returns:
        str: The SRT time string.

    Example:
        >>> timedelta_to_srt_time(timedelta(seconds=10))
        '00:00:10,000'
    """
    total_seconds = int(td.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = int(td.microseconds / 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def generate_srt(transcription_data):
    """
    Generate an SRT file from transcription data.

    Args:
        transcription_data (dict): The transcription data.

    Returns:
        str: The SRT file content.

    Example:
        >>> transcription_data = {'segments': [{'start': 0, 'end': 10, 'text': 'Hello, world!'}]}
        >>> srt_content = generate_srt(transcription_data)
    """
    logger.info("Starting SRT file generation")
    srt_content = ""
    for i, segment in enumerate(transcription_data['segments'], start=1):
        start_time = timedelta(seconds=segment['start'])
        end_time = timedelta(seconds=segment['end'])
        
        srt_content += f"{i}\n"
        srt_content += f"{timedelta_to_srt_time(start_time)} --> {timedelta_to_srt_time(end_time)}\n"
        srt_content += f"{segment['text'].strip()}\n\n"
    
    logger.info("SRT file generation completed")
    return srt_content

def create_srt_file(filename,data):
    filename = filename[0:len(filename)-4]
    file  = open(f"{filename}.txt",'w')
    file.write(data)
    file.close()
    return os.path.join(os.getcwd(), f"{filename}.txt")

def file_upload_to_s3(file_path: str, bucket_name: str, s3_key: str) -> str:
    """
    Upload a file to an S3 bucket.

    :param file_path: The local path to the file to upload.
    :param bucket_name: The name of the S3 bucket to upload to.
    :param s3_key: The S3 object key (i.e., the file path within the bucket).
    :param content_type: The content type (MIME type) of the file. Optional.
    :return: The URL of the uploaded file in S3.
    """

    try:

        # Upload the file to S3
        s3obj.upload_file(
            Filename=file_path,  # Local file path
            Bucket=bucket_name,  # S3 bucket name
            Key=s3_key          # S3 key (path in the bucket)
        )

        # Return the file URL
        file_url = f"https://{bucket_name}.s3.amazonaws.com/{s3_key}"
        return file_url

    except (NoCredentialsError, PartialCredentialsError) as e:
        raise Exception("AWS credentials not available") from e
    except Exception as e:
        raise Exception("File upload to S3 failed") from e

def get_optimal_font_scale(text: str, width: int) -> float:
    """
    Get the optimal font scale for a given text and width.

    Args:
        text (str): The text to be rendered.
        width (int): The maximum width of the text.

    Returns:
        float: The optimal font scale.

    Example:
        >>> get_optimal_font_scale("Hello, world!", 640)
        0.5
    """
    for scale in reversed(range(0, 60, 1)):
        textSize = cv2.getTextSize(text, fontFace=cv2.FONT_HERSHEY_DUPLEX, fontScale=scale/10, thickness=1)
        new_width = textSize[0][0]
        if (new_width <= width):
            return scale/10
    return 1

def extract_audio(video_path: str) -> str:
    """
    Extract audio from a video file.

    Args:
        video_path (str): The path to the video file.

    Returns:
        str: The path to the extracted audio file.

    Example:
        >>> audio_path = extract_audio('path/to/video.mp4')
    """
    logger.info(f"Starting audio extraction from {video_path}")
    video = VideoFileClip(video_path)
    audio_path = tempfile.mktemp(suffix='.wav')
    video.audio.write_audiofile(audio_path)
    logger.info(f"Audio extracted to {audio_path}")
    return audio_path

def generate_transcript(audio_path: str):
    """
    Generate a transcript from an audio file.

    Args:
        audio_path (str): The path to the audio file.

    Returns:
        object: The transcription result.

    Example:
        >>> transcription = generate_transcript('path/to/audio.wav')
    """
    logger.info(f"Starting transcription for {audio_path}")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device} for transcription")
    model = whisper.load_model("base", device=device)
    try:
        result = model.transcribe(audio_path, word_timestamps=True)
        logger.info("Transcription completed successfully")
        return result
    except Exception as e:
        logger.error(f"Error in transcription: {str(e)}", exc_info=True)
        raise ValueError(f"Could not request results from Speech Recognition service: {e}")

def add_captions_to_video(video_path: str, transcription: object, audio_path: str) -> str:
    """
    Add captions to a video file using a transcription result.

    Args:
        video_path (str): The path to the video file.
        transcription (object): The transcription result.
        audio_path (str): The path to the audio file.

    Returns:
        str: The path to the final video file with captions.

    Example:
        >>> final_video_path = add_captions_to_video('path/to/video.mp4', transcription, 'path/to/audio.wav')
    """
    logger.info(f"Starting caption addition to video {video_path}")
    
    # Check if CUDA is available for OpenCV
    if cv2.cuda.getCudaEnabledDeviceCount() > 0:
        logger.info("CUDA is available for OpenCV")
        cv2.cuda.setDevice(0)  # Use the first CUDA device
    else:
        logger.info("CUDA is not available for OpenCV, using CPU")
    
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
                
                (total_width, text_height), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_DUPLEX, font_scale, 1)
                text_x = (width - total_width) // 2
                text_y = height - 50

                cv2.rectangle(frame, (text_x - 10, text_y - text_height - 10),
                              (text_x + total_width + 10, text_y + 10), (0, 0, 0), -1)
                
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
                    
                    x += word_width + 5
                
            elif current_time >= segment['end']:
                current_segment_index += 1
        
        out.write(frame)
        frame_count += 1
    
    cap.release()
    out.release()
    logger.info(f"Caption addition completed. Output saved to {output_path}")

    logger.info("Starting audio merging process")
    input_video = ffmpeg.input(output_path)
    input_audio = ffmpeg.input(audio_path)
    uid = uuid.uuid4()
    final_output_path = f"{video_path.rsplit('.', 1)[0]}_captioned_with_audio_{uid}.mp4"
    ffmpeg.concat(input_video, input_audio, v=1, a=1).output(final_output_path).run(overwrite_output=True)
    logger.info(f"Audio merging completed. Final output: {final_output_path}")

    logger.info("Cleaning up temporary files")
    os.remove(output_path)
    os.remove(audio_path)

    return final_output_path
