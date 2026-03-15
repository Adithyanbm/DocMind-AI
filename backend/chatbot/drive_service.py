from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io
import datetime

def get_drive_service(access_token):
    """
    Helper function to build the Google Drive API client.
    """
    credentials = Credentials(token=access_token)
    return build('drive', 'v3', credentials=credentials)

def upload_chat_to_drive(access_token, messages, file_id=None):
    """
    Uploads the chat history to the user's Google Drive.
    """
    try:
        service = get_drive_service(access_token)
        
        # Determine a title from the first user message
        title_summary = "New Chat"
        for msg in messages:
            if msg.get("role") == "user":
                user_text = msg.get("content", "")[:30].strip()
                title_summary = "".join([c if c.isalnum() or c in [' ', '-', '_'] else "" for c in user_text])
                if len(msg.get("content", "")) > 30:
                    title_summary += "..."
                break
        
        if not title_summary:
            title_summary = "Chat"
        
        # Format the messages into a Markdown string
        formatted_content = f"# DocMind AI Chat Session\n*Saved on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n---\n\n"
        
        for msg in messages:
            role = "You" if msg.get("role") == "user" else "DocMind AI"
            content = msg.get("content", "")
            formatted_content += f"**{role}:**\n{content}\n\n"
            
        file_content = io.BytesIO(formatted_content.encode('utf-8'))
        
        file_metadata = {
            'name': f'DocMind_Chat_{title_summary.replace(" ", "_")}.md',
            'mimeType': 'text/markdown'
        }
        
        media = MediaIoBaseUpload(file_content, mimetype='text/markdown', resumable=True)
        
        file_metadata_update = {
            'name': f'DocMind_Chat_{title_summary.replace(" ", "_").replace("...", "")}.md'
        }
        
        if file_id:
            # Update existing file and name
            file = service.files().update(fileId=file_id, body=file_metadata_update, media_body=media, fields='id, name, webViewLink').execute()
        else:
            # Create a new file
            file_metadata = {
                'name': f'DocMind_Chat_{title_summary.replace(" ", "_").replace("...", "")}.md',
                'mimeType': 'text/markdown'
            }
            file = service.files().create(body=file_metadata, media_body=media, fields='id, name, webViewLink').execute()
        
        return {
            "success": True,
            "file_id": file.get('id'),
            "name": file.get('name'),
            "link": file.get('webViewLink')
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

def list_drive_chats(access_token):
    """
    Lists all Markdown chat files created by DocMind AI in the user's Google Drive.
    """
    try:
        service = get_drive_service(access_token)
        
        # Query: Find all files named DocMind_Chat_*.md
        query = "name contains 'DocMind_Chat_' and mimeType='text/markdown' and trashed=false"
        
        results = service.files().list(q=query, spaces='drive', fields='files(id, name, createdTime, modifiedTime)', orderBy='modifiedTime desc').execute()
        items = results.get('files', [])
        
        return {
            "success": True,
            "files": items
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

def get_drive_chat_content(access_token, file_id):
    """
    Downloads the content of a specific chat file from Google Drive.
    """
    try:
        service = get_drive_service(access_token)
        
        # Get the file's binary content
        request = service.files().get_media(fileId=file_id)
        file_content = request.execute()
        
        # Decode the bytes into a string
        text_content = file_content.decode('utf-8')
        
        return {
            "success": True,
            "content": text_content
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

def delete_chat_from_drive(access_token, file_id):
    """
    Deletes a specific chat file from the user's Google Drive.
    """
    try:
        service = get_drive_service(access_token)
        service.files().delete(fileId=file_id).execute()
        return {"success": True}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }
