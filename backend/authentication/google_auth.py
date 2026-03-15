import urllib.request
import urllib.error
import json
import os

def verify_google_oauth_token(token):
    """
    Verifies a Google OAuth Access Token and returns the payload if valid.
    Returns None if validation fails.
    """
    try:
        req = urllib.request.Request(f'https://oauth2.googleapis.com/tokeninfo?access_token={token}')
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return data
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Token verification HTTPError: {e.code} - {error_body}")
        return None
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Token verification failed: {e}")
        return None
