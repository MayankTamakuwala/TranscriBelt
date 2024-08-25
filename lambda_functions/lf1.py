import json
import boto3
import requests
import logging
from botocore.exceptions import ClientError
import uuid

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('data')

def generate_summary_using_llama_api(items):
    """Generate a summary using the OpenRouter Llama API."""
    api_url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
    }
    
    body = {
        "model": "meta-llama/llama-3.1-8b-instruct:free",
        "messages": [
            {
                "role": "system",
                "content": (
                    "I am providing you contents of transcript with timestamps of a video. provide a summary and key points of the file uploaded without including the timestamps and with no extra text or explanation")
            },
            {
                "role": "user",
                "content": items
            }
        ]
    }
    logger.info(f"Sending request to Llama API with content length: {len(items)}")
    response = requests.post(api_url, headers=headers, json=body)
    if response.status_code == 200:
        logger.info("Successfully received response from Llama API")
        return response.json()['choices'][0]['message']['content']
    else:
        logger.error(f"Failed to generate summary. Status code: {response.status_code}, Response: {response.text}")
        raise Exception(f"Failed to generate summary: {response.text}")

def get_s3_file_content(bucket, key):
    """Fetch content of a file from S3."""
    try:
        logger.info(f"Attempting to fetch file from S3. Bucket: {bucket}, Key: {key}")
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read().decode('utf-8')
        logger.info(f"Successfully fetched file from S3. Content length: {len(content)}")
        return content
    except ClientError as e:
        logger.error(f"Error fetching S3 file. Bucket: {bucket}, Key: {key}, Error: {str(e)}")
        return None

def save_to_dynamodb(folder_id, summary):
    """Create or update the item in DynamoDB."""
    try:
        response = table.put_item(
            Item={
                'folderID': str(folder_id),
                'summary': summary,
                'comments': []  # Initialize with an empty list
            }
        )
        logger.info(f"Successfully created/updated DynamoDB item. FolderId: {folder_id}")
        return response
    except Exception as e:
        logger.error(f"Error creating/updating DynamoDB item. FolderId: {folder_id}, Error: {str(e)}")
        raise

def lambda_handler(event, context):
    logger.info(f"Lambda function invoked with event: {json.dumps(event)}")
    
    for record in event['Records']:
        try:
            # Parse the message body
            body = json.loads(record['body'])
            bucket = body['bucket']
            key = body['key']
            url = body['url']
            folder_id = body['folder_id']
            
            logger.info(f"Processing file: {url}")
            
            # Fetch the content of the file from S3
            file_content = get_s3_file_content(bucket, key)
            
            if file_content:
                try:
                    # Generate summary using the Llama API
                    logger.info("Generating summary using Llama API")
                    summary = generate_summary_using_llama_api(file_content)
                    logger.info(f"Summary generated. Length: {len(summary)}")
                    
                    # Save the summary to DynamoDB
                    save_to_dynamodb(folder_id, summary)
                    logger.info("Summary saved to DynamoDB")
                    
                except Exception as e:
                    logger.error(f"Error generating or saving summary: {str(e)}", exc_info=True)
            else:
                logger.warning(f"Failed to fetch file content for {url}")
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON from SQS message: {str(e)}", exc_info=True)
        except KeyError as e:
            logger.error(f"Missing key in SQS message body: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"Unexpected error processing record: {str(e)}", exc_info=True)
    
    logger.info("Lambda execution completed")
    return {
        'statusCode': 200,
        'body': json.dumps('Processing complete')
    }
