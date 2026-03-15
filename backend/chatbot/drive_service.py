from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io
import datetime

def upload_chat_to_drive(access_token, messages):
    """
    Uploads the chat history to the user's Google Drive.
    """
    try:
        # Create credentials object from the access token provided by the frontend
        credentials = Credentials(token=access_token)
        
        # Build the Drive API client
        service = build('drive', 'v3', credentials=credentials)
        
        # Format the messages into a Markdown string
        formatted_content = f"# DocMind AI Chat Session\n*Saved on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n---\n\n"
        
        for msg in messages:
            role = "You" if msg.get("role") == "user" else "DocMind AI"
            content = msg.get("content", "")
            formatted_content += f"**{role}:**\n{content}\n\n"
            
        file_content = io.BytesIO(formatted_content.encode('utf-8'))
        
        file_metadata = {
            'name': f'DocMind_Chat_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.md',
            'mimeType': 'text/markdown'
        }
        
        media = MediaIoBaseUpload(file_content, mimetype='text/markdown', resumable=True)
        
        # Create the file in the root of the user's Drive
        file = service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
        
        return {
            "success": True,
            "file_id": file.get('id'),
            "link": file.get('webViewLink')
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }
