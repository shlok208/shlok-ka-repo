"""
New Content Modal Router - Handles content creation from the NewPostModal form
Provides a separate endpoint for direct form-based content creation.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Dict, Any, List
import logging
import os
import uuid
from datetime import datetime
from supabase import create_client, Client
from pydantic import BaseModel

from agents.new_content_modal import new_content_modal_agent
from auth import get_current_user

# Initialize Supabase client for file uploads
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

class ContentCreationRequest(BaseModel):
    """Request model for content creation from modal"""
    channel: str
    platform: str
    content_type: str
    media: str  # 'Generate', 'Upload', 'Without media'
    content_idea: str
    Post_type: str
    Image_type: str = None  # Only required when media is 'Generate'
    uploaded_files: List[Dict[str, Any]] = None  # Only present when media is 'Upload'

class ContentCreationResponse(BaseModel):
    """Response model for content creation"""
    success: bool
    message: str = None
    error: str = None
    content_id: str = None
    content: str = None
    title: str = None
    images: list = None
    hashtags: list = None

@router.post("/create-content", response_model=ContentCreationResponse)
async def create_content_from_modal(
    request: ContentCreationRequest,
    current_user = Depends(get_current_user)
) -> ContentCreationResponse:
    """
    Create new content from NewPostModal form data

    This endpoint handles direct content creation from the form without
    going through the chatbot conversation flow.
    """
    try:
        user_id = current_user.id

        logger.info(f"🎯 Creating content from modal for user: {user_id}")
        logger.info(f"Request data: {request.dict()}")

        # Validate required fields
        if not request.content_idea:
            raise HTTPException(
                status_code=400,
                detail="Content idea is required"
            )

        # Convert request to dict for the agent
        form_data = request.dict()

        # Call the new content modal agent
        result = await new_content_modal_agent.create_content_from_modal(form_data, user_id)

        if result['success']:
            return ContentCreationResponse(
                success=True,
                message=result.get('message', 'Content created successfully'),
                content_id=result.get('content_id'),
                content=result.get('content'),
                title=result.get('title'),
                images=result.get('images', []),
                hashtags=result.get('hashtags', [])
            )
        else:
            return ContentCreationResponse(
                success=False,
                error=result.get('error', 'Unknown error occurred')
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in create_content_from_modal: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create content: {str(e)}"
        )

@router.get("/content-types")
async def get_content_types():
    """Get available content types for the modal"""
    return {
        "content_types": [
            {"value": "static_post", "label": "Static Post"},
            {"value": "carousel", "label": "Carousel"},
            {"value": "short_video or reel", "label": "Short Video/Reel"},
            {"value": "long_video", "label": "Long Video"},
            {"value": "blog", "label": "Blog Post"}
        ]
    }

@router.get("/post-types")
async def get_post_types():
    """Get available post types for the modal"""
    return {
        "post_types": [
            {"value": "Educational tips", "label": "Educational Tips"},
            {"value": "Quote / motivation", "label": "Quote / Motivation"},
            {"value": "Promotional offer", "label": "Promotional Offer"},
            {"value": "Product showcase", "label": "Product Showcase"},
            {"value": "Carousel infographic", "label": "Carousel Infographic"},
            {"value": "Announcement", "label": "Announcement"},
            {"value": "Testimonial / review", "label": "Testimonial / Review"},
            {"value": "Before–after", "label": "Before–After"},
            {"value": "Behind-the-scenes", "label": "Behind-the-Scenes"},
            {"value": "User-generated content", "label": "User-Generated Content"},
            {"value": "Brand story", "label": "Brand Story"},
            {"value": "Meme / humor", "label": "Meme / Humor"}
        ]
    }

@router.get("/image-types")
async def get_image_types():
    """Get available image types for generation"""
    return {
        "image_types": [
            {"value": "photorealistic", "label": "Photorealistic"},
            {"value": "illustrative", "label": "Illustrative"},
            {"value": "minimalist", "label": "Minimalist"},
            {"value": "vibrant", "label": "Vibrant"},
            {"value": "professional", "label": "Professional"},
            {"value": "casual", "label": "Casual"},
            {"value": "modern", "label": "Modern"},
            {"value": "vintage", "label": "Vintage"}
        ]
    }

@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Upload a file (image or video) to Supabase storage

    Supports files up to 300MB for images and videos.
    """
    try:
        logger.info(f"📁 Starting file upload for user {current_user.id}: {file.filename}, size: {file.size}, type: {file.content_type}")

        if not file.filename:
            logger.error("❌ No filename provided")
            raise HTTPException(status_code=400, detail="No filename provided")

        if file.size == 0:
            logger.error("❌ Empty file")
            raise HTTPException(status_code=400, detail="Empty file")
        # Validate file size (300MB limit)
        max_size = 300 * 1024 * 1024  # 300MB in bytes
        file_content = await file.read()
        logger.info(f"📄 File content read, size: {len(file_content)} bytes")

        if len(file_content) > max_size:
            logger.error(f"❌ File too large: {len(file_content)} > {max_size}")
            raise HTTPException(
                status_code=413,
                detail="File size exceeds 300MB limit"
            )

        # Validate file type
        allowed_types = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'
        ]

        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only images and videos are allowed"
            )

        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1] if '.' in file.filename else ''
        if not file_extension:
            # Fallback based on content type
            if file.content_type == 'image/jpeg':
                file_extension = '.jpg'
            elif file.content_type == 'image/png':
                file_extension = '.png'
            elif file.content_type == 'image/gif':
                file_extension = '.gif'
            elif file.content_type == 'image/webp':
                file_extension = '.webp'
            elif file.content_type == 'video/mp4':
                file_extension = '.mp4'
            else:
                file_extension = '.bin'  # Fallback

        unique_filename = f"{uuid.uuid4()}{file_extension}"

        # Use ai-generated-images bucket for all uploads (images and videos)
        bucket_name = "ai-generated-images"
        file_path = f"user_uploads/{current_user.id}/{unique_filename}"

        # Upload to Supabase storage
        try:
            logger.info(f"☁️ Uploading to Supabase bucket: {bucket_name}, path: {file_path}")
            storage_response = supabase.storage.from_(bucket_name).upload(
                file_path,
                file_content,
                file_options={
                    "content-type": file.content_type,
                    "upsert": "true"
                }
            )
            logger.info(f"☁️ Supabase upload response: {storage_response}")

            if hasattr(storage_response, 'error') and storage_response.error:
                logger.error(f"❌ Supabase upload error: {storage_response.error}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to upload file to storage"
                )

            # Get public URL
            public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)

            if not public_url:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to generate public URL for uploaded file"
                )

            logger.info(f"✅ File uploaded successfully: {file_path}")

            return {
                "success": True,
                "url": public_url,
                "filename": file.filename,
                "file_path": file_path,
                "bucket": bucket_name,
                "size": len(file_content),
                "content_type": file.content_type
            }

        except Exception as upload_error:
            logger.error(f"Error uploading to Supabase: {upload_error}")
            raise HTTPException(
                status_code=500,
                detail="Failed to upload file to storage"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in file upload: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )