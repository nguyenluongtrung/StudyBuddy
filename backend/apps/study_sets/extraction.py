from pathlib import Path

from pptx import Presentation
from pypdf import PdfReader
from rest_framework import serializers


MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_SOURCE_CHARS = 50_000
SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf", ".pptx"}


def extract_upload(upload):
    extension = Path(upload.name).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise serializers.ValidationError({"file": "Upload a .txt, .md, .pdf, or .pptx file."})
    if upload.size > MAX_UPLOAD_BYTES:
        raise serializers.ValidationError({"file": "The file must be 10 MB or smaller."})
    try:
        upload.seek(0)
        if extension in {".txt", ".md"}:
            content = upload.read().decode("utf-8-sig")
        elif extension == ".pdf":
            content = "\n".join(page.extract_text() or "" for page in PdfReader(upload).pages)
        else:
            presentation = Presentation(upload)
            content = "\n".join(
                shape.text for slide in presentation.slides for shape in slide.shapes
                if shape.has_text_frame and shape.text.strip()
            )
    except Exception as exc:
        raise serializers.ValidationError({"file": "This file could not be read. Try another file or paste its text."}) from exc
    finally:
        upload.seek(0)
    content = content.strip()
    if not content:
        raise serializers.ValidationError({"file": "No readable text was found. For scanned PDFs, paste the text instead."})
    return content
