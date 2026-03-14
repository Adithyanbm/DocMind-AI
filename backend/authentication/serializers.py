from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': True},
            'email': {'required': True}
        }

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data.get('last_name', '')
        )
        # Create profile and generate code
        profile, created = UserProfile.objects.get_or_create(user=user)
        code = profile.generate_new_code()
        
        # Send actual email
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        
        subject = 'Verify your DocMind AI Account'
        text_content = f'Welcome to DocMind AI!\n\nYour verification code is: {code}\n\nPlease enter this code on the verification page to activate your account.'
        
        html_content = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #2563eb; margin: 0; font-size: 24px;">DocMind AI</h2>
            </div>
            
            <h1 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">Welcome to DocMind AI!</h1>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Thank you for signing up. To complete your registration and secure your account, please use the following verification code:
            </p>
            
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">{code}</span>
            </div>
            
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 32px;">
                Enter this code on the verification page to activate your account. This code will expire soon.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                If you didn't request this email, you can safely ignore it.<br>
                &copy; 2026 DocMind AI. All rights reserved.
            </p>
        </div>
        """
        
        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            
            print(f"Successfully sent HTML verification email to {user.email}")
        except Exception as e:
            print(f"Failed to send HTML email to {user.email}: {str(e)}")
        
        return user
