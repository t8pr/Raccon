from io import BytesIO
from unittest.mock import Mock

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

from services.storage_service import MAX_FILE_SIZE, MAX_IMAGE_DIMENSION, StorageService, settings


@pytest.fixture
def storage(monkeypatch):
    client = Mock()
    monkeypatch.setattr("services.storage_service.boto3.client", lambda *args, **kwargs: client)
    return StorageService()


def png_bytes(width=1):
    buffer = BytesIO()
    Image.new("RGB", (width, 1)).save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.mark.parametrize("content_type, data, message", [
    ("text/plain", b"text", "Invalid file type"),
    ("image/png", b"0" * (MAX_FILE_SIZE + 1), "File is too large"),
    ("image/png", b"not an image", "Invalid or corrupted"),
    ("image/png", png_bytes(MAX_IMAGE_DIMENSION + 1), "Image dimensions are too large"),
])
def test_upload_rejects_invalid_images_before_writing_to_storage(storage, content_type, data, message):
    file = UploadFile(BytesIO(data), filename="test.png", headers=Headers({"content-type": content_type}))
    with pytest.raises(HTTPException) as exc:
        storage.upload_image(file)
    assert exc.value.status_code == 400
    assert message in exc.value.detail
    storage.s3_client.upload_fileobj.assert_not_called()


def test_upload_and_promote_use_expected_storage_paths(storage):
    file = UploadFile(BytesIO(png_bytes()), filename="upload", headers=Headers({"content-type": "image/png"}))
    url = storage.upload_image(file)
    stream, bucket, key = storage.s3_client.upload_fileobj.call_args.args
    assert stream.tell() == 0
    assert bucket == settings.R2_BUCKET_NAME
    assert key.startswith("temp/") and key.endswith(".png")
    assert storage.s3_client.upload_fileobj.call_args.kwargs["ExtraArgs"]["ContentType"] == "image/png"
    assert url == f"{settings.R2_PUBLIC_URL}/{key}"

    permanent_key = key.replace("temp/", "hints/", 1)
    assert storage.promote_image(url) == f"{settings.R2_PUBLIC_URL}/{permanent_key}"
    storage.s3_client.copy_object.assert_called_once_with(
        CopySource={"Bucket": bucket, "Key": key}, Bucket=bucket, Key=permanent_key
    )
    storage.s3_client.delete_object.assert_called_once_with(Bucket=bucket, Key=key)
