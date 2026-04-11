import urllib.request
import urllib.error
import urllib.parse
import json
import os
from datetime import datetime, timedelta
from django.utils import timezone

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

def exchange_code_for_tokens(code):
    """
    Exchanges an authorization code for access and refresh tokens.
    """
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    # We need to specify the redirect_uri that was used in the frontend
    # Note: 'postmessage' is used by @react-oauth/google for auth-code flow
    redirect_uri = 'postmessage' 
    
    url = 'https://oauth2.googleapis.com/token'
    params = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    
    data = urllib.parse.urlencode(params).encode('utf-8')
    req = urllib.request.Request(url, data=data)
    
    try:
        print(f"DEBUG: Attempting token exchange with code: {code[:10]}...")
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                token_data = json.loads(response.read().decode('utf-8'))
                print("DEBUG: Token exchange SUCCESSFUL")
                return token_data
            else:
                print(f"DEBUG: Token exchange failed with status: {response.status}")
                return None
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Token exchange HTTPError: {e.code} - {error_body}")
        # Log specifically if it's a redirect_uri mismatch or client secret issue
        try:
            error_json = json.loads(error_body)
            print(f"Google API Error Details: {error_json.get('error_description', 'No description')}")
        except:
            pass
        return None
    except Exception as e:
        print(f"Token exchange failed with unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def refresh_google_token(user_profile):
    """
    Uses the refresh token in the user profile to get a new access token.
    """
    if not user_profile.google_refresh_token:
        print("No refresh token found for user")
        return None
        
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    url = 'https://oauth2.googleapis.com/token'
    params = {
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': user_profile.google_refresh_token,
        'grant_type': 'refresh_token'
    }
    
    data = urllib.parse.urlencode(params).encode('utf-8')
    req = urllib.request.Request(url, data=data)
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                token_data = json.loads(response.read().decode('utf-8'))
                
                # Update profile
                user_profile.google_access_token = token_data.get('access_token')
                expires_in = token_data.get('expires_in', 3600)
                user_profile.google_token_expiry = timezone.now() + timedelta(seconds=expires_in)
                user_profile.save()
                
                return token_data.get('access_token')
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Token refresh HTTPError: {e.code} - {error_body}")
        return None
    except Exception as e:
        print(f"Token refresh failed: {e}")
        return None
