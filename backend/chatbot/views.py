import os
import json
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from openai import OpenAI
from .drive_service import upload_chat_to_drive, list_drive_chats, get_drive_chat_content, delete_chat_from_drive

NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY')

client = OpenAI(
  base_url="https://integrate.api.nvidia.com/v1",
  api_key=NVIDIA_API_KEY
)

def stream_nvidia_response(messages):
    try:
        # Determine if we need a vision-capable model
        has_vision = False
        for msg in messages:
            if isinstance(msg.get("content"), list):
                has_vision = True
                break
                
        # Use the specific Mistral model the user requested
        model_to_use = "meta/llama-3.2-90b-vision-instruct" if has_vision else "mistralai/mistral-large-3-675b-instruct-2512"

        response = client.chat.completions.create(
            model=model_to_use,
            messages=messages,
            max_tokens=16384,
            top_p=1,
            temperature=1,
            stream=True
        )
        
        for chunk in response:
            if not getattr(chunk, "choices", None):
                continue
                
            delta = chunk.choices[0].delta
            reasoning = getattr(delta, "reasoning_content", None)
            content = getattr(delta, "content", None)
            
            # Mock up an SSE payload for the frontend
            payload = {"choices": [{"delta": {}}]}
            
            if reasoning:
                payload["choices"][0]["delta"]["reasoning_content"] = reasoning
            if content is not None:
                payload["choices"][0]["delta"]["content"] = content
                
            if not reasoning and content is None:
                continue

            yield f"data: {json.dumps(payload)}\n\n"
    except Exception as e:
        with open("error_log.txt", "a") as f:
            f.write(f"Error: {str(e)}\nMessages: {json.dumps(messages)}\n\n")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_completions(request):
    try:
        messages = request.data.get('messages', [])
        
        # Protect against empty messages
        if not messages:
            return JsonResponse({'error': 'Messages payload is required'}, status=400)

        # Enforce tight, unpadded markdown spacing dynamically via LLM context rules
        formatting_sys_prompt = {
            "role": "system", 
            "content": (
                "For every project request, respond precisely with the following flow:\n\n"
                "1. Begin with an introductory context paragraph. This text MUST be generated before any code.\n"
                "   - VERY IMPORTANT: The absolute first line of your response MUST begin exactly with `ACTION: ` followed by a short 1-sentence summary of the project. (e.g., `ACTION: Creating a structured React chatbot website with Dino game artifact`).\n"
                "   - KEEP THE INTRODUCTION VERY SHORT. Strictly limit the initial description to 5 or 6 lines maximum before starting the code.\n"
                "   - NEVER explicitly print literal section headers like 'Instruction & Description:' or 'Intro:' or 'Initial Context:'. Just write the `ACTION:` line, followed directly by your short description context.\n"
                "2. Generate the project files as purely sequential code blocks. DO NOT output conversational text BETWEEN the code blocks. They must stack cleanly.\n"
                "3. FOR CODING TASKS ONLY: Immediately after the final code block, but BEFORE your final conclusion, you MUST generate a 'Separation of Concerns' section. Format this seamlessly (e.g., as a clean markdown list or table) mapping each generated file back to its strict architectural responsibility (e.g., `models.js` -> Physics and state, `DinoGame.jsx` -> Composes react components).\n"
                "4. Finish with a thorough conclusion followed by actionable future suggestions. This text MUST be generated after the Separation of Concerns.\n"
                "   - NEVER use literal section headers (like 'Conclusion' or 'Next Steps'), and NEVER explicitly announce 'Here are some future suggestions:'. Seamlessly and organically weave your future recommendations into the conversation's flow.\n"
                "   - IMPORTANT: Always format the final actionable suggestions as clean bullet points or numbered lists for readability. You MUST place every point on its own strict NEW LINE.\n\n"
                "### Required Files (generate ALL of these as independent code blocks):\n\n"
                "1. **setup_script.sh**: Shell/terminal commands to scaffold the project\n"
                "2. **Dependency file**: (e.g., `package.json`, `pubspec.yaml`, `requirements.txt`)\n"
                "3. **Models**: All data models, interfaces, types, or classes (e.g., `models.js`, `models.dart`)\n"
                "4. **Theme/Design System**: Colors, typography, spacing (e.g., `theme.js`, `styles.css`)\n"
                "5. **Seed Data**: (e.g., `data.json`, `seed.js`) with rich content including:\n"
                "     - correctIndex or answer key\n"
                "     - explanation: detailed educational explanation (2-3 sentences)\n"
                "     - funFact: an interesting related fact\n"
                "6. **Additional files**: Screens, components, services, routes, etc., each in its own code block\n\n"
                "### Data Quality Rules:\n"
                "- explanations must be 2-4 sentences, genuinely educational\n"
                "- funFacts must be surprising, specific, and verifiable\n"
                "- All data entries must be complete â€” no placeholders like \"// add more here\"\n"
                "- Minimum 8-10 data entries for any list/quiz/dataset\n\n"
                "### Code Quality Rules:\n"
                "- Every file must be complete and runnable â€” no \"TODO\" or \"...\" placeholders\n"
                "- Include all imports\n"
                "- Follow best practices for the target language/framework\n"
                "- Add brief inline comments for non-obvious logic\n\n"
                "### Format Rules:\n"
                "- NEVER use markdown horizontal rules like `---`.\n"
                "- Use triple backtick code blocks with the language specified\n"
                "- **CRITICAL REQUIREMENTS FOR INDIVIDUAL CODE BLOCKS:**\n"
                "  1) First line MUST be `// filename: [filepath.ext]`.\n"
                "  2) Second line MUST be `// description: [One brief sentence describing this file]`. DO NOT OMIT THIS.\n"
                "  3) Proceed with the code.\n"
            )
        }
        
        if messages[0].get('role') == 'system':
            messages[0] = formatting_sys_prompt
        else:
            messages.insert(0, formatting_sys_prompt)

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
