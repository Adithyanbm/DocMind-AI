from django.db import models
from django.contrib.auth.models import User
import random
import string

def generate_verification_code():
    """Generates a random 6-digit verification code."""
    return ''.join(random.choices(string.digits, k=6))

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    is_email_verified = models.BooleanField(default=False)
    verification_code = models.CharField(max_length=6, blank=True, null=True)
    
    # Google OAuth tokens
    google_access_token = models.TextField(blank=True, null=True)
    google_refresh_token = models.TextField(blank=True, null=True)
    google_token_expiry = models.DateTimeField(blank=True, null=True)

    def generate_new_code(self):
        """Generates a new code, assigns it, and saves the profile."""
        self.verification_code = generate_verification_code()
        self.save()
        return self.verification_code

    def __str__(self):
        return f'{self.user.username} Profile'
