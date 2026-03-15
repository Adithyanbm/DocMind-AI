from google.oauth2 import id_token
from google.auth.transport import requests
import os

def verify_google_oauth_token(token):
    """
    Verifies a Google OAuth JWT token and returns the payload if valid.
    Returns None if validation fails.
    """
    try:
        # Note: In a production environment, you must pass the client ID 
        # to ensure the token was meant for this specific application.
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        
        # Specify the CLIENT_ID of the app that accesses the backend
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), client_id)
        
        # idinfo contains claims like:
        # { 'iss': 'accounts.google.com', 'aud': '...', 'sub': '...', 'email': '...', ... }
        return idinfo
    except ValueError as e:
        # Invalid token
        print(f"Token verification failed: {e}")
        return None
