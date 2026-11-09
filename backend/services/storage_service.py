import boto3
from botocore.exceptions import ClientError
from core.config import settings
from fastapi import UploadFile, HTTPException
import uuid
import os
import io
from PIL import Image, UnidentifiedImageError

MAX_FILE_SIZE = 2 * 1024 * 1024 # 2MB 
ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_IMAGE_DIMENSION = 2048

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto"
        )

    def upload_image(self, file: UploadFile) -> str:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WebP are allowed.")

        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File is too large. Maximum size is 2MB.")

        try:
            image_data = file.file.read()
            img = Image.open(io.BytesIO(image_data))
            img.verify()
            
            width, height = img.size
            if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
                raise HTTPException(status_code=400, detail=f"Image dimensions are too large. Maximum allowed is {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION} pixels.")
                
        except UnidentifiedImageError:
            raise HTTPException(status_code=400, detail="Invalid or corrupted image file.")
        finally:
            file.file.seek(0)

        file_extension = os.path.splitext(file.filename)[1].lower()
        if not file_extension or file_extension not in [".jpg", ".jpeg", ".png", ".webp"]:
            ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
            file_extension = ext_map.get(file.content_type, ".webp")

        unique_filename = f"temp/{uuid.uuid4().hex}{file_extension}"

        try:
            self.s3_client.upload_fileobj(
                file.file,
                settings.R2_BUCKET_NAME,
                unique_filename,
                ExtraArgs={
                    "ContentType": file.content_type,
                    "CacheControl": "public, max-age=31536000"
                }
            )
        except ClientError as e:
            raise HTTPException(status_code=500, detail="Failed to upload image to storage server.")

        return f"{settings.R2_PUBLIC_URL}/{unique_filename}"

    def promote_image(self, temp_url: str) -> str:
        """Transfers an image from the temporary path to the permanent path in the cloud storage."""
        if "temp/" not in temp_url:
            return temp_url
            
        try:
            temp_key = temp_url.split(f"{settings.R2_PUBLIC_URL}/")[1]
            permanent_key = temp_key.replace("temp/", "hints/")
            
            copy_source = {
                'Bucket': settings.R2_BUCKET_NAME,
                'Key': temp_key
            }
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=settings.R2_BUCKET_NAME,
                Key=permanent_key
            )
            self.s3_client.delete_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=temp_key
            )
            
            return f"{settings.R2_PUBLIC_URL}/{permanent_key}"
        except Exception:
            return temp_url

    def delete_image(self, image_url: str):
        """Deletes an image from the cloud storage based on its URL."""
        if not image_url or settings.R2_PUBLIC_URL not in image_url:
            return
            
        try:
            object_key = image_url.split(f"{settings.R2_PUBLIC_URL}/")[1]
            self.s3_client.delete_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=object_key
            )
        except Exception:
            pass