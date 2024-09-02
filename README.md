<div align="center">
    <img src = "https://github.com/MayankTamakuwala/TranscriBelt/blob/main/public/logo.png" width="300">
    <h1 align="center">TranscriBelt</h1>
</div>

TranscriBelt is a web application that allows users to upload videos, automatically transcribes them using advanced AI models, and adds dynamic subtitles. The application also provides functionality for authenticated users to add, edit, or delete comments on the transcribed text. All processed videos are stored and publicly accessible via Amazon S3.

## Features

- Video Upload & Processing: Upload videos through the frontend. The backend processes the video, generates a transcript, and adds subtitles.
- Dynamic Subtitles: Subtitles are added directly onto the video using the transcription generated.
- CRUD Operations on Transcripts: Authenticated users can perform Create, Read, Update, and Delete operations on the transcripts through the frontend.
- Public Access to Videos: All processed videos are stored in S3 and can be accessed by anyone.

## Tech Stack

- Frontend:
    - Next.js (TypeScript)
	- Next.js API Routes
- Backend:
	- FastAPI (Python)
	- Redis for caching
	- Celery for task queue management
	- FFmpeg, OpenAI Whisper, OpenCV for video processing
- Cloud Services (AWS):
	- S3 for storage
	- SQS for messaging
	- Lambda functions for serverless processing
	- DynamoDB for storing metadata

## Architecture Overview

<img src="https://github.com/MayankTamakuwala/TranscriBelt/blob/main/public/architecture.png"/>

## High-Level Workflow

1. 	User Uploads Video: The authorized user uploads a video via the frontend.
2.	Video Processing: The video is cached using Redis, and added into the task queue, then processed using the FastAPI backend, which utilizes FFmpeg, OpenAI Whisper, and OpenCV to generate the transcript and embed dynamic subtitles over the video.
3.	Storage: The processed video and its transcript are stored in an S3 bucket.
4.	CRUD Operations: Authenticated users can add, delete, or edit comments on the transcript. These operations are managed through Next.js API routes and are processed in AWS SQS that triggers AWS Lambda and DynamoDB.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- Python 3.11.0
- AWS CLI configured with your credentials OR AWS Management Console
- Redis server
- Ffmpeg
- 4 different terminals on your local system (until Docker update kicks in)

### Installation and Running Application

#### Terminal 1: Frontend Server

1.	Clone the repository:
```bash
git clone https://github.com/MayankTamakuwala/TranscriBelt.git
cd TranscriBelt
```

2.	Install frontend dependencies:
```bash
npm install
```

3.	Run the Frontend Server:
```bash
npm run dev
```

#### Terminal 2: Backend Server

1. `cd` to the project root folder

2. Change directory to backend:
```bash
cd video-processing-backend
```

3. Make virtual environment:
```bash
python3.11 -m venv venv
```

4. Activate Virtual Environment:

	Windows:	
	```
	.\venv\Scripts\activate
	```

	MacOS:
	```
	source venv/bin/activate
	```

5. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

6. Run the Backend Server:
```bash
fastapi dev main.py
```

#### Terminal 3: Redis Server

1. Install Redis

2. Run Redis Server:
```bash
redis-server
```

#### Terminal 4: Celery Server

1. `cd` to the project root folder

2. Change directory to backend:
```bash
cd video-processing-backend
```

3. Activate Virtual Environment:

	Windows:	
	```
	.\venv\Scripts\activate
	```

	MacOS:
	```
	source venv/bin/activate
	```


4. Run Celery Server
```bash
celery -A tasks worker --loglevel=INFO --pool=solo
```

### Environment Variables

Create a `.env` file in both the frontend and backend directories with the following environment variables:

#### Frontend (.env.local):
```bash
# AWS
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_BUCKET_NAME=your_s3_bucket_name
AWS_REGION=your_aws_region
DYNAMODB_TABLE_NAME=your_dynamo_db_table_name_for_saving_comments
SQS_QUEUE_URL=your_aws_sqs_url

# Clerk JS
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

#### Backend (.env):

Inside `video-processing-backend` directory
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_BUCKET_NAME=your_s3_bucket_name
AWS_REGION=your_aws_region
SQS_QUEUE_URL=your_aws_sqs_url
```

## Deployment

You can deploy the frontend to Vercel or any other hosting platform that supports Next.js. The backend can be deployed to AWS Lambda or any other server environment that supports FastAPI.

## Demo

Checkout the video demo on <a href="https://www.youtube.com/watch?v=P9jkTA1EJlI">YouTube</a>

## Usage

- Upload a video from the frontend.
- Wait for the video to be processed. You will see the transcribed video with subtitles available for public viewing.
- Authenticated users can add, edit, or delete comments on the transcript.

## Acknowledgments
- **OpenAI Whisper** for transcription services
- **AWS** for cloud services
- **Redis** for caching support
- **Celery** for tasks queueing


