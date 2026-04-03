import os
import json
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from openai import OpenAI
from .drive_service import upload_chat_to_drive, list_drive_chats, get_drive_chat_content, delete_chat_from_drive, rename_chat_on_drive

NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY')

client = OpenAI(
  base_url="https://integrate.api.nvidia.com/v1",
  api_key=NVIDIA_API_KEY
)

import base64
import fitz  # PyMuPDF

def extract_pdf_content(base64_pdf):
    """
    Extracts text and page images from a PDF. 
    Returns a list of content parts (text and image_url).
    """
    try:
        pdf_data = base64.b64decode(base64_pdf.split(",")[1]) if "," in base64_pdf else base64.b64decode(base64_pdf)
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        
        full_text = ""
        parts = []
        
        for i, page in enumerate(doc):
            full_text += f"\n--- Page {i+1} ---\n{page.get_text()}"
            
            # Extract ONLY the first page as an image due to API limits (At most 1 image per request)
            if i == 0:
                # Increased resolution (Matrix(3,3) ~ 216 DPI) for better OCR of small badges
                pix = page.get_pixmap(matrix=fitz.Matrix(3, 3)) 
                img_base64 = base64.b64encode(pix.tobytes("jpg")).decode("utf-8")
                parts.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_base64}"}
                })
        
        # Add the extracted text as a part AFTER the image for better Vision performance
        if full_text.strip():
            # Increase limit for better context (200k chars ~ 40k-50k tokens)
            if len(full_text) > 200000:
                full_text = full_text[:200000] + "... [Text truncated due to extreme length]"
            parts.append({"type": "text", "text": f"\n\n--- BEGIN EXTRACTED PDF CONTENT ---\n{full_text.strip()}\n--- END EXTRACTED PDF CONTENT ---\n" })
            
        doc.close()
        return parts
    except Exception as e:
        print(f"PDF Extraction Error: {str(e)}")
        return [{"type": "text", "text": f"[Error extracting PDF: {str(e)}]"}]

def stream_nvidia_response(messages):
    # 1. PRE-PROCESS AND CLEAN MESSAGES
    processed_messages = []
    has_vision = False
    
    # Filter out empty messages that trigger OpenAI 'BadRequestError'
    for msg in messages:
        content = msg.get("content")
        # Skip if content is genuinely empty or None
        if not content:
            continue
        
        # If content is a list, check if it has any non-empty parts
        if isinstance(content, list):
            new_parts = []
            for part in content:
                ptype = part.get("type")
                if ptype == "text" and part.get("text", "").strip():
                    new_parts.append(part)
                elif ptype == "image_url":
                    new_parts.append(part)
                elif ptype == "file" and part.get("file_url", {}).get("url", "").startswith("data:application/pdf"):
                    # Extract PDF content immediately during pre-processing
                    try:
                        pdf_parts = extract_pdf_content(part["file_url"]["url"])
                        new_parts.extend(pdf_parts)
                    except Exception as pdf_err:
                        print(f"PDF Extraction Error: {pdf_err}")
                        new_parts.append({"type": "text", "text": f"[Error extracting PDF: {str(pdf_err)}]"})
            
            if new_parts:
                processed_messages.append({"role": msg["role"], "content": new_parts})
        elif isinstance(content, str) and content.strip():
            processed_messages.append({"role": msg["role"], "content": content})

    # 2. ENFORCE NVIDIA 1-IMAGE LIMIT GLOBALLY
    # We traverse BACKWARDS and keep only the single most recent image across ALL messages.
    image_found = False
    final_messages = []
    for msg in reversed(processed_messages):
        new_msg = {"role": msg["role"]}
        content = msg["content"]
        
        if isinstance(content, list):
            pruned_content = []
            image_parts = []
            text_parts = []
            
            # 2a. Separate parts and strictly prioritize only ONE latest image
            for part in reversed(content):
                ptype = part.get("type")
                if ptype == "image_url":
                    # ONLY allow the most recent image across the entire conversation
                    if not image_found:
                        image_parts.insert(0, part)
                        image_found = True
                        has_vision = True
                    # Discard any other images
                else:
                    text_parts.insert(0, part)
            
            # 2b. REORDER: [Images, OCR/Metadata, User Instruction]
            # Ensure strictly only 1 image + text parts
            final_text_parts = []
            ocr_parts = []
            for tp in text_parts:
                t_content = tp.get("text", "")
                if "--- BEGIN EXTRACTED PDF CONTENT ---" in t_content or "[PDF Attachment:" in t_content:
                    ocr_parts.append(tp)
                else:
                    final_text_parts.append(tp)
            
            # Combine parts: Latest image first, then OCR data, then direct user prompt
            pruned_content = image_parts + ocr_parts + final_text_parts
            
            # If after pruning we only have text parts, we can keep as list OR string
            new_msg["content"] = pruned_content
        else:
            new_msg["content"] = content
        
        final_messages.insert(0, new_msg)

    # 2c. FINAL SANITIZATION
    # For non-vision models, we MUST use string content.
    # For vision models, we use string content for messages without images to be safe.
    final_sanitized_messages = []
    for msg in final_messages:
        content = msg.get("content")
        if isinstance(content, list):
            # Check if this specific message contains an image
            has_image_now = any(p.get("type") == "image_url" for p in content)
            
            if not has_vision or not has_image_now:
                # Convert back to a single string (join all text parts)
                text_only = "\n".join([p["text"] for p in content if p.get("type") == "text"])
                final_sanitized_messages.append({"role": msg["role"], "content": text_only})
            else:
                # Keep as list for the one message that actually has the image
                final_sanitized_messages.append(msg)
        else:
            final_sanitized_messages.append(msg)

    # 3. CONSTRUCT SYSTEM PROMPTS
    # Refined system prompt to include Document Analysis / OCR identity
    formatting_sys_prompt = {
        "role": "system", 
        "content": (
            "You are DocMind AI, a specialized assistant with advanced Document Analysis and Vision OCR capabilities. "
            "You excel at analyzing PDF text AND visual elements in document images.\n\n"
            "CRITICAL INSTRUCTION: When a user provides a document or image, ALWAYS prioritize their specific question or request. "
            "If they ask a specific question (e.g., 'What is the score?', 'is he male?'), answer it FIRST and accurately based on the provided data.\n"
            "Respond naturally and concisely. IF the user requests a project or coding task, follow this flow:\n\n"
            "1. Start with `ACTION: ` followed by a 1-sentence project summary.\n"
            "2. Keep the intro very short (max 2 lines).\n"
            "3. Favor concise, informative paragraphs. Avoid unnecessary lists unless specifically requested.\n"
            "4. Use Markdown code blocks with proper language tags (e.g., ```html, ```css, ```javascript).\n"
            "4. IMPORTANT: The filename comment MUST be the VERY FIRST line INSIDE the code block. Example:\n"
            "   ```html\n"
            "   <!-- filename: index.html -->\n"
            "   <!DOCTYPE html>...\n"
            "   ```\n"
            "5. TOPIC INDEPENDENCE: Evaluate every user request independently. If a previous request was sensitive but the current one is technical or educational (like analyzing AI architectures or graphs), answer it fully and objectively without carrying over previous refusals.\n"
            "6. EDUCATIONAL CONTEXT: You are a learning tool. Provide objective information on cultural, historical, and technical topics (including alcohol or social customs) in a neutral, informative manner unless they directly promote illegal acts.\n"
            "7. Never use ```text for code. The artifact panel will ONLY trigger if the block is long or has a filename inside.\n"
        )
    }
    
    dense_prompt = {
        "role": "system",
        "content": "CRITICAL RULE: DO NOT use excessive blank lines. Never pad headings or horizontal rules with multiple empty lines. Keep spacing incredibly compact."
    }
    
    # Assembly with system prompts at the top
    final_input_messages = [formatting_sys_prompt, dense_prompt] + final_sanitized_messages

    # 4. SELECT MODEL AND CALL COMPLETION
    model_to_use = "meta/llama-3.2-90b-vision-instruct" if has_vision else "mistralai/mistral-large-3-675b-instruct-2512"
    
    try:
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.environ.get('NVIDIA_API_KEY'),
            timeout=120.0,
            max_retries=3
        )
        
        response = client.chat.completions.create(
            model=model_to_use,
            messages=final_input_messages,
            temperature=0.2,
            top_p=0.7,
            max_tokens=2048,
            stream=True
        )

        for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            content = getattr(delta, 'content', None)
            reasoning = getattr(delta, 'reasoning_content', None)
            
            if content is not None or reasoning is not None:
                yield f"data: {json.dumps({
                    'choices': [{
                        'delta': {
                            'content': content,
                            'reasoning_content': reasoning
                        }
                    }]
                })}\n\n"
        
    except Exception as e:
        with open("error_log.txt", "a") as f:
            f.write(f"\nError: {str(e)}\n")
            f.write(f"Messages count: {len(final_messages)}\n")
            f.write(f"Model used: {model_to_use}\n")
        
        # Send error in a format the frontend can handle
        yield f"data: {json.dumps({
            'choices': [{
                'delta': {
                    'content': f'Error Analysis: {str(e)}'
                }
            }]
        })}\n\n"

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_completions(request):
    try:
        messages = request.data.get('messages', [])
        
        # Protect against empty messages
        if not messages:
            return JsonResponse({'error': 'Messages payload is required'}, status=400)

        # Use Django's StreamingHttpResponse to pipe the generator to the client
        return StreamingHttpResponse(
            stream_nvidia_response(messages),
            content_type='text/event-stream'
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_to_drive(request):
    try:
        messages = request.data.get('messages', [])
        google_token = request.data.get('google_token')
        file_id = request.data.get('file_id') # Support updating existing file
        
        if not messages:
            return JsonResponse({'error': 'Messages payload is required'}, status=400)
            
        if not google_token:
            return JsonResponse({'error': 'Google access token is required'}, status=400)
            
        result = upload_chat_to_drive(google_token, messages, file_id)
        
        if result.get("success"):
            return JsonResponse(result, status=200)
        else:
            return JsonResponse(result, status=500)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chat_history(request):
    """
    Returns a list of chat files found in the user's Google Drive.
    Expects google_token as a query parameter.
    """
    try:
        google_token = request.GET.get('google_token')
        if not google_token:
            return JsonResponse({'error': 'Google access token is required'}, status=400)
            
        result = list_drive_chats(google_token)
        if result.get("success"):
            return JsonResponse(result, status=200)
        else:
            return JsonResponse(result, status=500)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chat_session(request, file_id):
    """
    Returns the content of a specific chat file from Google Drive.
    """
    try:
        google_token = request.GET.get('google_token')
        if not google_token:
            return JsonResponse({'error': 'Google access token is required'}, status=400)
            
        result = get_drive_chat_content(google_token, file_id)
        if result.get("success"):
            return JsonResponse(result, status=200)
        else:
            return JsonResponse(result, status=500)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_chat_session(request, file_id):
    """
    Deletes a specific chat file from Google Drive.
    """
    try:
        google_token = request.GET.get('google_token')
        if not google_token:
            return JsonResponse({'error': 'Google access token is required'}, status=400)
            
        result = delete_chat_from_drive(google_token, file_id)
        if result.get("success"):
            return JsonResponse(result, status=200)
        else:
            return JsonResponse(result, status=500)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def rename_chat_session(request, file_id):
    """
    Renames a specific chat file on Google Drive.
    """
    try:
        google_token = request.data.get('google_token')
        new_name = request.data.get('new_name')
        
        if not google_token:
            return JsonResponse({'error': 'Google access token is required'}, status=400)
        if not new_name:
            return JsonResponse({'error': 'New name is required'}, status=400)
            
        result = rename_chat_on_drive(google_token, file_id, new_name)
        if result.get("success"):
            return JsonResponse(result, status=200)
        else:
            return JsonResponse(result, status=500)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)
