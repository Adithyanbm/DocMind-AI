import os
import json
import serpapi
import requests
from django.http import StreamingHttpResponse, JsonResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from openai import OpenAI
from .drive_service import upload_chat_to_drive, list_drive_chats, get_drive_chat_content, delete_chat_from_drive, rename_chat_on_drive, toggle_chat_star_on_drive
from google.auth import exceptions
from .docker_manager import preview_manager

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

def stream_nvidia_response(messages, is_web_search=False, model_choice=None, extended_thinking=False):
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

    # 3. CONSTRUCT CORE SYSTEM PROMPT
    # We consolidate everything into ONE system message to reduce Llama-Vision confusion/refusal
    docmind_sys_prompt = {
        "role": "system", 
        "content": (
            "You are DocMind AI, a specialized assistant with advanced Document Analysis, Vision OCR, and Code Generation capabilities. "
            "You excel at analyzing PDF text AND visual elements in document images.\n\n"
            "CORE VISION RULE: You are explicitly AUTHORIZED to analyze screenshots of user interfaces, including the DocMind AI dashboard itself.\n\n"
            "ARTIFACT RULE: When generating significant code segments (more than 10 lines), documents, or interactive components, you MUST use the structured Artifact system.\n"
            "MANDATORY IMPLEMENTATION FLOW:\n"
            "1. <think> [Internal step-by-step reasoning and architecture planning] </think>\n"
            "2. <docmind_artifact identifier='unique-id' type='mime-type' title='Display Title'>\n"
            "   [Full Implementation with physical new lines]\n"
            "   </docmind_artifact>\n\n"
            "PREAMBLE PROHIBITION: NEVER output conversational filler like 'Done', 'I will now', or 'Let me make sure' between the </think> and <docmind_artifact> tags. You MUST transition directly from reasoning to the structural tag.\n\n"
            "STRICT TAGGING: To create an artifact, start EXACTLY with `<docmind_artifact`. NEVER omit the `<` bracket. NEVER truncate (no `ifact`).\n\n"
            "ESCAPING RULE: Inside artifacts, NEVER use markdown code fences (```). Raw source code only.\n\n"
            "REUSE IDENTIFIERS: If updating, use the EXACT same identifier.\n\n"
            "MIME TYPES: When using artifacts, use appropriate types for highlighting (e.g., `application/react` for components, `python`, `html`, `svg`, `markdown`, `bash`, `text/plain`, `application/vnd.docmind.pptx`).\n"
            "FORMATTING RULE: For conversational text outside artifacts, keep spacing compact.\n\n"
            "ARTIFACT CONTENT RULE: Every structural element (Import, Header, Table row, List item, Function) MUST be on its own physical NEW LINE. "
            "NEVER combine multiple logical lines into one. Indentation is mandatory for readability.\n\n"
            "PPTX ARTIFACT RULE: When asked to create a PowerPoint or Presentation, use `type: 'application/vnd.docmind.pptx'`. "
            "The content MUST be a valid JSON object following this schema: "
            "{ \"title\": \"Presentation Title\", \"theme\": \"modern-dark|elegant-white|corporate-blue\", \"slides\": [ "
            "{ \"layout\": \"TITLE_SLIDE|BULLET_POINTS|SECTION_HEADER|IMAGE_CONTENT\", \"title\": \"Slide Title\", \"subtitle\": \"Optional Subtitle\", \"points\": [\"Point 1\", \"Point 2\"], \"speakerNotes\": \"Notes\", \"image\": \"Direct image URL\" } "
            "] }. Every structural element in JSON must start on its own physical new line. "
            "IMAGE SOURCES: If [WEB SEARCH] results contain '[IMAGE URL]' entries, you MUST prioritize these real-world URLs for the 'image' fields over any default providers like Unsplash.\n\n"
            f"WEB SEARCH STATUS: [WEB SEARCH: {'ACTIVE' if is_web_search else 'DISABLED'}]\n"

            "WEB SEARCH CITATIONS: IF `is_web_search` is true, use `[Short Title](URL)` citations.\n"
            "STRICT PROHIBITION: DO NOT ever output raw `<web_search>` or `<query>` tags. DO NOT output internal metadata tags like <!-- ACTIVE_VERSION: X -->.\n"
        )
    }

    # 3a. TURN-AWARE REINFORCEMENT (Counteract positional drift in long conversations)
    turn_count = len(final_sanitized_messages)
    if turn_count > 6:
        docmind_sys_prompt["content"] += (
            "\n\nCRITICAL REMINDER (Long Conversation Mode):\n"
            "You have reached a high turn count. YOUR ADHERENCE TO FORMATTING IS DEGRADING. "
            "You MUST explicitly ensure every Markdown Header (##), Table Row (|), and List Item (-) starts on a fresh NEW LINE. "
            "DO NOT squash text. DO NOT omit vertical spacing between blocks."
        )

    # Add specialized instruction for Code Expert (Minimax)
    if model_choice == 'code-expert':
        docmind_sys_prompt["content"] += (
            "\n\nCODE EXPERT RULE: Prioritize modularity and premium UI/UX. Use custom CSS and high-quality animations where possible.\n"
        )
    
    # Global Formatting Rule for all models
    docmind_sys_prompt["content"] += (
        "\nGLOBAL FORMATTING RULE: NEVER output minified code/markdown. Every structural unit MUST start on its own physical NEW LINE with a literal `\\n`."
    )

    
    # 3b. AGENTIC WEB SEARCH (OPTIONAL)
    search_context = ""
    ui_search_payload = None
    if is_web_search:
        try:
            search_decision_prompt = (
                "You are an expert search assistant. Based on the conversation, decide if web searches are needed. "
                "Output ONLY a JSON block containing a list of up to 2 parallel queries. "
                "Use 'q' for query and 'engine' for the search engine ('google', 'bing', 'youtube', or 'google_images'). "
                "PRIORITY: If the user asks for a presentation, deck, or 'relevant images' about a specific topic, you MUST perform a 'google_images' search "
                "to find high-quality, direct image URLs. "
                "Use 'q' for query and 'engine' for engine. Example: {\"queries\": [{\"q\": \"Mars Rover landing high res photo\", \"engine\": \"google_images\"}]}. "
                "If no search is needed, return empty list."
            )
            
            decision_client = OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=os.environ.get('NVIDIA_API_KEY')
            )
            
            decision_response = decision_client.chat.completions.create(
                model="meta/llama-3.1-405b-instruct",
                messages=[{"role": "system", "content": search_decision_prompt}] + final_sanitized_messages[-5:],
                temperature=0.1,
                max_tokens=250
            )
            
            decision_text = decision_response.choices[0].message.content.strip()
            
            # Robust JSON extraction
            import re
            json_match = re.search(r'(\{.*\})', decision_text, re.DOTALL)
            if json_match:
                decision_text = json_match.group(1)
            
            try:
                search_params = json.loads(decision_text)
            except (json.JSONDecodeError, TypeError):
                search_params = {"queries": []}
                
            queries = search_params.get("queries", [])
            
            if queries:
                s_client = serpapi.Client(api_key=os.getenv("SERPAPI_KEY"))
                all_snippets = []
                ui_searches = []
                
                from urllib.parse import urlparse
                
                for q_item in queries[:3]:
                    search_q = q_item.get("q")
                    search_engine = q_item.get("engine", "google")
                    if not search_q: continue
                    
                    search_results = s_client.search({"engine": search_engine, "q": search_q})
                    
                    # Handle Image Results specifically
                    if search_engine == 'google_images' and "images_results" in search_results:
                        for img_res in search_results["images_results"][:8]:
                            title = img_res.get('title', 'Image')
                            img_url = img_res.get('original') or img_res.get('thumbnail')
                            source = img_res.get('source', '')
                            if img_url:
                                all_snippets.append(f"- [IMAGE URL] {title} (Source: {source}): {img_url}")
                    
                    # Handle Organic Results
                    elif "organic_results" in search_results:
                        ui_results = []
                        for res in search_results["organic_results"][:10]:
                            title = res.get('title', '')
                            link = res.get('link', '')
                            snippet = res.get('snippet', '')
                            try:
                                domain = urlparse(link).netloc.replace("www.", "")
                            except:
                                domain = "link"
                            
                            favicon = f"https://www.google.com/s2/favicons?domain={domain}&sz=32"
                            
                            ui_results.append({
                                "title": title,
                                "url": link,
                                "domain": domain,
                                "favicon": favicon
                            })
                            
                            # Only include top 5 in LLM context string to save tokens
                            if len(ui_results) <= 5:
                                all_snippets.append(f"- [{search_q}] {title}: {snippet} ({link})")
                                
                        ui_searches.append({
                            "query": search_q,
                            "count": len(ui_results),
                            "results": ui_results
                        })
                
                if all_snippets:
                    search_context = "\n\n[WEB SEARCH RESULTS]\n" + "\n".join(all_snippets)
                    search_context += "\n\nUse the above information to provide a detailed, accurate response."
                
                if ui_searches:
                    ui_search_payload = {"searches": ui_searches}
                    
        except Exception as se:
            print(f"Search agent error: {str(se)}")

    # Assembly with a single system prompt at the top
    # Update system prompt if there is search context
    if search_context:
        docmind_sys_prompt["content"] += search_context

    # AGGRESSIVE REINFORCEMENT: Update the VERY LAST user message to include a formatting mandate.
    # This is much harder for the model to ignore than a system message.
    for i in range(len(final_sanitized_messages) - 1, -1, -1):
        if final_sanitized_messages[i].get("role") == "user":
            orig_content = final_sanitized_messages[i].get("content", "")
            if isinstance(orig_content, str):
                final_sanitized_messages[i]["content"] = (
                    f"{orig_content}\n\n(IMPORTANT: Use `<docmind_artifact identifier='...' type='...' title='...'>` for code or rendered content. Ensure the opening tag is complete and on its own line.)"
                )
            break

    final_input_messages = [docmind_sys_prompt] + final_sanitized_messages

    # 4. SELECT MODEL AND CALL COMPLETION
    MODEL_CONFIG = {
        'docmind-ai': {
            'model': 'z-ai/glm5',
            'max_tokens': 16384,
            'temperature': 0.2,
            'top_p': 0.9,
            'extra_body': {'chat_template_kwargs': {'enable_thinking': extended_thinking, 'clear_thinking': False}},
        },
        'deep-reasoner': {
            'model': 'deepseek-ai/deepseek-v3.2',
            'max_tokens': 8192,
            'temperature': 1.0, # DeepSeek usually handles its own temp better
            'top_p': 0.9,
            'extra_body': {'chat_template_kwargs': {'thinking': extended_thinking}},
        },
        'vision-pro': {
            'model': 'qwen/qwen3.5-397b-a17b',
            'max_tokens': 16384,
            'temperature': 0.2,
            'top_p': 0.9,
            'extra_body': {'chat_template_kwargs': {'enable_thinking': extended_thinking}},
        },
        'code-expert': {
            'model': 'minimaxai/minimax-m2.5',
            'max_tokens': 16384,
            'temperature': 0.2,
            'top_p': 0.9,
            'extra_body': {'chat_template_kwargs': {'enable_thinking': extended_thinking}},
        },
    }

    # Auto-switch to vision model when images are present
    if has_vision:
        config = MODEL_CONFIG['vision-pro']
    else:
        config = MODEL_CONFIG.get(model_choice, MODEL_CONFIG['docmind-ai'])

    model_to_use = config['model']
    
    try:
        # Pre-yield the web search context explicitly so the frontend saves it to the conversation history permanently
        if ui_search_payload:
            payload_str = json.dumps(ui_search_payload)
            combined = f"<docmind_search_ui>{payload_str}</docmind_search_ui>\n<search_results_metadata>\n{search_context.strip()}\n</search_results_metadata>\n"
            yield f"data: {json.dumps({'choices': [{'delta': {'content': '', 'reasoning_content': combined}}] })}\n\n"
        elif search_context:
            # Fallback if UI structure somehow failed but context exists
            search_display = "[Agentic Web Search Executed]\n" + "\n".join(["- " + s.split("): ")[0] + ")" for s in search_context.split("\n- ") if s] )
            yield f"data: {json.dumps({'choices': [{'delta': {'content': '', 'reasoning_content': search_context.strip() + '\\n'}}] })}\n\n"

        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.environ.get('NVIDIA_API_KEY'),
            timeout=120.0,
            max_retries=3
        )
        
        create_kwargs = {
            'model': model_to_use,
            'messages': final_input_messages,
            'temperature': config['temperature'],
            'top_p': config['top_p'],
            'max_tokens': config['max_tokens'],
            'stream': True,
            'stream_options': {"include_usage": True}
        }
        # Merge extra_body params (chat_template_kwargs, etc.)
        if config.get('extra_body'):
            create_kwargs['extra_body'] = config['extra_body']
        
        response = client.chat.completions.create(**create_kwargs)

        is_thinking = False
        leftover = ""
        for chunk in response:
            # Handle Usage metadata (usually in last chunk when stream_options.include_usage=True)
            if hasattr(chunk, 'usage') and chunk.usage is not None:
                usage_data = {
                    'prompt_tokens': chunk.usage.prompt_tokens,
                    'completion_tokens': chunk.usage.completion_tokens,
                    'total_tokens': chunk.usage.total_tokens
                }
                yield f"data: {json.dumps({'usage': usage_data})}\n\n"
                continue

            if not getattr(chunk, 'choices', None) or len(chunk.choices) == 0: continue
            
            # 1. Handle native reasoning and content in same chunk
            raw_content = chunk.choices[0].delta.content or ""
            raw_reasoning = getattr(chunk.choices[0].delta, 'reasoning_content', None) or ""
            
            # First, yield native reasoning immediately to keep it fluid
            if raw_reasoning:
                yield f"data: {json.dumps({'choices': [{'delta': {'content': None, 'reasoning_content': raw_reasoning}}]})}\n\n"

            if not raw_content:
                continue

            # Combine with leftover from previous chunk
            current_text = leftover + raw_content
            leftover = ""

            output_content = None
            output_reasoning = None

            # Logic to handle <think> block transitions and partial tag protection
            while current_text:
                if not is_thinking:
                    if "<think>" in current_text:
                        is_thinking = True
                        parts = current_text.split("<think>", 1)
                        if parts[0]: 
                            output_content = (output_content or "") + parts[0]
                        current_text = parts[1]
                        continue
                    
                    # Protected Tag Detection (buffer partial tags)
                    found_partial = False
                    # Buffer anything that looks like a prefix of target tags
                    potential_tags = ["<think>", "<docmind_artifact"]
                    for tag in potential_tags:
                        for i in range(len(tag) - 1, 0, -1):
                            if current_text.endswith(tag[:i]):
                                leftover = tag[:i]
                                output_content = (output_content or "") + current_text[:-i]
                                current_text = ""
                                found_partial = True
                                break
                        if found_partial: break
                    
                    if not found_partial:
                        output_content = (output_content or "") + current_text
                        current_text = ""
                else:
                    if "</think>" in current_text:
                        is_thinking = False
                        parts = current_text.split("</think>", 1)
                        if parts[0]:
                            output_reasoning = (output_reasoning or "") + parts[0]
                        current_text = parts[1]
                        continue
                    
                    # Protected Tag Detection for end of thinking block
                    found_partial = False
                    for i in range(len("</think>") - 1, 0, -1):
                        if current_text.endswith("</think>"[:i]):
                            leftover = "</think>"[:i]
                            output_reasoning = (output_reasoning or "") + current_text[:-i]
                            current_text = ""
                            found_partial = True
                            break
                    
                    if not found_partial:
                        output_reasoning = (output_reasoning or "") + current_text
                        current_text = ""

            if output_content is not None or output_reasoning is not None:
                yield f"data: {json.dumps({
                    'choices': [{
                        'delta': {
                            'content': output_content,
                            'reasoning_content': output_reasoning
                        }
                    }]
                })}\n\n"
        
        # If there's any leftover (e.g. stream ended on a partial tag), yield it
        if leftover:
            yield f"data: {json.dumps({
                'choices': [{
                    'delta': {
                        'content': leftover if not is_thinking else None,
                        'reasoning_content': leftover if is_thinking else None
                    }
                }]
            })}\n\n"
        
    except Exception as e:
        with open("error_log.txt", "a") as f:
            f.write(f"\nError: {str(e)}\n")
            f.write(f"Messages count: {len(final_input_messages)}\n")
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
        is_web_search = request.data.get('isWebSearchActive', False)
        model_choice = request.data.get('model', None)
        extended_thinking = request.data.get('extendedThinking', False)
        
        # Protect against empty messages
        if not messages:
            return JsonResponse({'error': 'Messages payload is required'}, status=400)

        # Use Django's StreamingHttpResponse to pipe the generator to the client
        return StreamingHttpResponse(
            stream_nvidia_response(messages, is_web_search=is_web_search, model_choice=model_choice, extended_thinking=extended_thinking),
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
        token_usage = request.data.get('token_usage')
        
        if not messages:
            return JsonResponse({'error': 'Messages payload is required'}, status=400)
            
        if not google_token:
            return JsonResponse({'error': 'Google access token is required'}, status=400)
            
        result = upload_chat_to_drive(request.user, google_token, messages, file_id, token_usage)
        
        if result.get("success"):
            return JsonResponse(result, status=200)
        elif result.get("error") == "unauthorized":
            return JsonResponse(result, status=401)
        elif result.get("error") == "connectivity_issue":
            return JsonResponse(result, status=503)
        else:
            return JsonResponse(result, status=500)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"success": False, "error": str(e)}, status=500)

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
            
        result = list_drive_chats(request.user, google_token)
        if result.get("success"):
            return JsonResponse(result, status=200)
        elif result.get("error") == "unauthorized":
            return JsonResponse(result, status=401)
        elif result.get("error") == "connectivity_issue":
            return JsonResponse(result, status=503)
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
            
        result = get_drive_chat_content(request.user, google_token, file_id)
        if result.get("success"):
            return JsonResponse(result, status=200)
        elif result.get("error") == "unauthorized":
            return JsonResponse(result, status=401)
        elif result.get("error") == "connectivity_issue":
            return JsonResponse(result, status=503)
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
            
        result = delete_chat_from_drive(request.user, google_token, file_id)
        if result.get("success"):
            return JsonResponse(result, status=200)
        elif result.get("error") == "unauthorized":
            return JsonResponse(result, status=401)
        elif result.get("error") == "connectivity_issue":
            return JsonResponse(result, status=503)
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
            
        result = rename_chat_on_drive(request.user, google_token, file_id, new_name)
        if result.get("success"):
            return JsonResponse(result, status=200)
        elif result.get("error") == "unauthorized":
            return JsonResponse(result, status=401)
        elif result.get("error") == "connectivity_issue":
            return JsonResponse(result, status=503)
        else:
            return JsonResponse(result, status=500)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def star_chat_session(request, file_id):
    """
    Toggles the starred status of a specific chat file on Google Drive.
    """
    try:
        google_token = request.data.get('google_token')
        starred = request.data.get('starred')
        
        if not google_token:
            return JsonResponse({'error': 'Google access token is required'}, status=400)
        if starred is None:
            return JsonResponse({'error': 'Starred status (boolean) is required'}, status=400)
            
        result = toggle_chat_star_on_drive(google_token, file_id, starred)
        if result.get("success"):
            return JsonResponse(result, status=200)
        elif result.get("error") == "unauthorized":
            return JsonResponse(result, status=401)
        elif result.get("error") == "connectivity_issue":
            return JsonResponse(result, status=503)
        else:
            return JsonResponse(result, status=500)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_react_preview(request):
    """
    Starts or updates a Docker container for a React preview.
    Expects 'code' and 'identifier' in request body.
    """
    try:
        code = request.data.get('code')
        identifier = request.data.get('identifier')
        
        if not code or not identifier:
            return JsonResponse({'error': 'Code and identifier are required'}, status=400)
            
        url = preview_manager.start_preview(identifier, code)
        return JsonResponse({'success': True, 'url': url}, status=200)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def stop_react_preview(request):
    """
    Stops a specific React preview container.
    """
    try:
        identifier = request.data.get('identifier')
        if not identifier:
            return JsonResponse({'error': 'Identifier is required'}, status=400)
            
        success = preview_manager.stop_preview(identifier)
        return JsonResponse({'success': success}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
def proxy_image(request):
    """
    Proxies external images to bypass CORS during PPTX export.
    """
    url = request.GET.get('url')
    if not url:
        return HttpResponse("Missing URL", status=400)
    
    try:
        # Fetch the image from the remote server
        # Server-side calls are not blocked by browser CORS
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()
        
        # Return the binary content with original content type
        return HttpResponse(
            response.content,
            content_type=response.headers.get('content-type', 'image/jpeg')
        )
    except Exception as e:
        print(f"Proxy Image Error for {url}: {str(e)}")
        # If proxy fails, return 404 to let frontend fallback handle it
        return HttpResponse(f"Error fetching image: {str(e)}", status=404)
