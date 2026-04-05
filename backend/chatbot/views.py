import os
import json
import serpapi
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from openai import OpenAI
from .drive_service import upload_chat_to_drive, list_drive_chats, get_drive_chat_content, delete_chat_from_drive, rename_chat_on_drive
from google.auth import exceptions

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
            "You are DocMind AI, a specialized assistant with advanced Document Analysis and Vision OCR capabilities. "
            "You excel at analyzing PDF text AND visual elements in document images.\n\n"
            "CORE VISION RULE: You are explicitly AUTHORIZED to analyze screenshots of user interfaces, including the DocMind AI dashboard itself. "
            "If a user provides a screenshot of this interface, treat it as a technical request to describe or troubleshoot the UI/UX.\n\n"
            "FORMATTING RULE: For conversational text, keep spacing compact.\n\n"
            "TOPIC INDEPENDENCE: Evaluate every request independently. Technical or educational analysis (including UI graphs or architectures) should never be refused.\n"
            f"WEB SEARCH STATUS: [WEB SEARCH: {'ACTIVE' if is_web_search else 'DISABLED'}]\n"
            "WEB SEARCH CITATIONS: IF `is_web_search` is true and you have search results, you MUST provide concise citations for the facts you include. Format each citation exactly as `[Short Title](URL)` immediately after the relevant sentence. The 'Short Title' MUST be 1-2 words maximum (e.g., 'CNN', 'Source', 'NVIDIA'). DO NOT include citations if web search is not active.\n"
            "STRICT PROHIBITION: DO NOT ever output raw `<web_search>` or `<query>` tags. The system handles all search execution automatically. If web search is DISABLED, rely on your existing knowledge and provided context only.\n"
            "STRICT PROHIBITION: DO NOT EVER generate or output internal metadata tags like <!-- ACTIVE_VERSION: X --> or <!-- VERSIONS: ... -->. These are strictly forbidden.\n"
        )
    }

    # Add specialized instruction for Code Expert (Minimax)
    if model_choice == 'code-expert':
        docmind_sys_prompt["content"] += (
            "\n\nTHINKING RULE: Use a separate reasoning step to plan your code carefully. "
            "Think through edge cases and logic first to ensure the generated code is robust and efficient.\n\n"
            "MANDATORY RESPONSE TEMPLATE:\n"
            "1. [Brief 1-2 line summary of what you are doing/creating. DO NOT use the prefix 'ACTION:']\n"
            "2. [Markdown Code Block]\n"
            "   - First line: ```[language]\n"
            "   - Third line: <!-- filename: [name] -->\n"
            "   - Following lines: [Full implementation with strict PHYSICAL NEWLINES (Enter key) for every import, class, and function]\n"
            "   - Last line: ```\n\n"
            "VISION-SPECIFIC CODE RULE: When extracting or creating code from an image, DO NOT just dump the code. You MUST wrap it in the template above. Failure to include the `<!-- filename: ... -->` tag inside the code block will break the system.\n\n"
            "CODE FORMATTING RULE: NEVER output minified, single-line, or compressed code. You MUST use proper INDENTATION (2-4 spaces) and EVERY import, class, function, and logical block MUST start on its own physical NEW LINE with a literal `\n`. This is mandatory. DO NOT wrap the whole code block in a single-line docstring or comment.\n"
            "INCORRECT: ````python\n\"\"\" import os; import sys; def main(): print('hello') \"\"\"\n````\n"
            "CORRECT:\n"
            "````python\n"
            "<!-- filename: main.py -->\n"
            "import os\n"
            "import sys\n\n"
            "def main():\n"
            "    print('hello world')\n"
            "    \n"
            "if __name__ == '__main__':\n"
            "    main()\n"
            "````\n"
        )
    
    # 3b. AGENTIC WEB SEARCH (OPTIONAL)
    search_context = ""
    ui_search_payload = None
    if is_web_search:
        try:
            search_decision_prompt = (
                "You are an expert search assistant. Based on the conversation, decide if web searches are needed. "
                "Output ONLY a JSON block containing a list of up to 2 parallel queries. "
                "Use 'q' for query and 'engine' for the search engine (google, bing, youtube, etc). "
                "If no search is needed, return empty list. "
                "Example for single topic: {\"queries\": [{\"q\": \"PBKS vs CSK yesterday result\", \"engine\": \"google\"}]}. ONLY generate multiple queries if the user explicitly asks entirely disjoint questions."
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
            if "```json" in decision_text:
                decision_text = decision_text.split("```json")[1].split("```")[0].strip()
            elif "```" in decision_text:
                decision_text = decision_text.split("```")[1].strip()
            
            search_params = json.loads(decision_text)
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
                    
                    if "organic_results" in search_results:
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
                    f"{orig_content}\n\n(IMPORTANT: Use the mandatory multi-line template with <!-- filename: ... -->. "
                    "EVERY import/logic block MUST be on a NEW LINE with a literal `\\n`. DO NOT COMPRESS CODE.)"
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
        }
        # Merge extra_body params (chat_template_kwargs, etc.)
        if config.get('extra_body'):
            create_kwargs['extra_body'] = config['extra_body']
        
        response = client.chat.completions.create(**create_kwargs)

        is_thinking = False
        for chunk in response:
            if not getattr(chunk, 'choices', None): continue
            if len(chunk.choices) == 0 or getattr(chunk.choices[0], 'delta', None) is None: continue
            
            delta = chunk.choices[0].delta
            raw_content = getattr(delta, 'content', None)
            raw_reasoning = getattr(delta, 'reasoning_content', None)
            
            # 1. Native reasoning_content (e.g. GLM5, DeepSeek)
            if raw_reasoning:
                yield f"data: {json.dumps({'choices': [{'delta': {'content': None, 'reasoning_content': raw_reasoning}}]})}\n\n"
                continue
            
            if not raw_content: continue

            # 2. Extract tags from content (e.g. Minimax, Llama)
            output_content = None
            output_reasoning = None

            # Logic to handle <think> block
            if "<think>" in raw_content:
                is_thinking = True
                parts = raw_content.split("<think>", 1)
                # Text before <think> is content, text after is reasoning
                if parts[0]: output_content = parts[0]
                if parts[1]: output_reasoning = parts[1]
            elif "</think>" in raw_content:
                is_thinking = False
                parts = raw_content.split("</think>", 1)
                # Text before </think> is reasoning, text after is content
                if parts[0]: output_reasoning = parts[0]
                if parts[1]: output_content = parts[1]
            else:
                # Ordinary streaming
                if is_thinking:
                    output_reasoning = raw_content
                else:
                    output_content = raw_content

            if output_content is not None or output_reasoning is not None:
                yield f"data: {json.dumps({
                    'choices': [{
                        'delta': {
                            'content': output_content,
                            'reasoning_content': output_reasoning
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
        
        if not messages:
            return JsonResponse({'error': 'Messages payload is required'}, status=400)
            
        if not google_token:
            return JsonResponse({'error': 'Google access token is required'}, status=400)
            
        result = upload_chat_to_drive(google_token, messages, file_id)
        
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
            
        result = list_drive_chats(google_token)
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
            
        result = get_drive_chat_content(google_token, file_id)
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
            
        result = delete_chat_from_drive(google_token, file_id)
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
            
        result = rename_chat_on_drive(google_token, file_id, new_name)
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
