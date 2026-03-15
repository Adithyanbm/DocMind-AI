import os
import json
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from openai import OpenAI
from .drive_service import upload_chat_to_drive

NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY')

client = OpenAI(
  base_url="https://integrate.api.nvidia.com/v1",
  api_key=NVIDIA_API_KEY
)

def stream_nvidia_response(messages):
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages,
            max_tokens=4096,
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
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

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
        
        if not messages:
            return JsonResponse({'error': 'Messages payload is required'}, status=400)
            
        if not google_token:
            return JsonResponse({'error': 'Google access token is required'}, status=400)
            
        result = upload_chat_to_drive(google_token, messages)
        
        if result.get("success"):
            return JsonResponse(result, status=200)
        else:
            return JsonResponse(result, status=500)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)
