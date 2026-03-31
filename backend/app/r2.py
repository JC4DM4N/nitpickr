import os
import boto3
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

_account_id = os.environ['R2_ACCOUNT_ID']
_bucket     = os.environ['R2_BUCKET']
_folder     = os.environ['R2_FOLDER']

_client = boto3.client(
    's3',
    endpoint_url=f'https://{_account_id}.r2.cloudflarestorage.com',
    aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
    region_name='auto',
)


def upload(file_bytes: bytes, filename: str, content_type: str = 'image/png') -> str:
    """Upload bytes to R2 and return the object key."""
    key = f'{_folder}/{filename}'
    _client.put_object(
        Bucket=_bucket,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return key


def presign(filename: str, expires_in: int = 3600) -> str:
    """Return a presigned URL for a screenshot filename, valid for expires_in seconds."""
    key = f'{_folder}/{filename}'
    return _client.generate_presigned_url(
        'get_object',
        Params={'Bucket': _bucket, 'Key': key},
        ExpiresIn=expires_in,
    )
