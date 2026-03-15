from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .serializers import RegisterSerializer
from .models import UserProfile
from .google_auth import verify_google_oauth_token

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class VerifyEmailView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({'error': 'Email and code are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            profile = user.profile
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except UserProfile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

        if profile.is_email_verified:
            return Response({'message': 'Email is already verified'}, status=status.HTTP_200_OK)

        if profile.verification_code == code:
            profile.is_email_verified = True
            profile.verification_code = None # Clear code after successful verification
            profile.save()
            return Response({'message': 'Email verified successfully'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)

class ResendCodeView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email')

        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            profile = user.profile
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except UserProfile.DoesNotExist:
             return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

        if profile.is_email_verified:
            return Response({'message': 'Email is already verified'}, status=status.HTTP_200_OK)

        code = profile.generate_new_code()
        
        # Send actual email
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        
        subject = 'New Verification Code for DocMind AI'
        text_content = f'You requested a new verification code.\n\nYour new verification code is: {code}\n\nPlease enter this code on the verification page.'
        
        html_content = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #2563eb; margin: 0; font-size: 24px;">DocMind AI</h2>
            </div>
            
            <h1 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">Action Required: Verify Email</h1>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                You recently requested a new verification code. Here is your updated code:
            </p>
            
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">{code}</span>
            </div>
            
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
            print(f"Successfully sent new HTML verification email to {user.email}")
        except Exception as e:
            print(f"Failed to send email to {user.email}: {str(e)}")

        return Response({'message': 'New verification code sent'}, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # For security, we don't want to reveal if an email exists or not
            return Response({'message': 'If an account with this email exists, a password reset code has been sent.'}, status=status.HTTP_200_OK)
        
        profile, _ = UserProfile.objects.get_or_create(user=user)
        code = profile.generate_new_code()
        
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        
        subject = 'DocMind AI - Password Reset Request'
        text_content = f'You have requested to reset your password.\n\nYour 6-digit verification code is: {code}\n\nIf you did not request this, please ignore this email.'
        
        html_content = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #2563eb; margin: 0; font-size: 24px;">DocMind AI</h2>
            </div>
            
            <h1 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">Password Reset Request</h1>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We received a request to reset the password for your DocMind AI account. Please use the following 6-digit code to securely complete the reset process:
            </p>
            
            <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px; border: 1px solid #bfdbfe;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">{code}</span>
            </div>
            
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 32px;">
                Enter this code on the password recovery screen.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.<br>
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
            
            print(f"Successfully sent HTML password reset email to {user.email}")
        except Exception as e:
            print(f"Failed to send email to {user.email}: {str(e)}")

        return Response({'message': 'If an account with this email exists, a password reset code has been sent.'}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('new_password')
        
        if not all([email, code, new_password]):
            return Response({'error': 'Email, code, and new_password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            profile = UserProfile.objects.get(user=user)
        except (User.DoesNotExist, UserProfile.DoesNotExist):
            return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)
        
        if profile.verification_code != code:
            return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)
        
        # We also want to verify their email if they haven't already
        if not profile.is_email_verified:
            profile.is_email_verified = True
            
        # Clear the code and update the password safely
        profile.verification_code = ''
        profile.save()
        
        user.set_password(new_password)
        user.save()
        
        return Response({'message': 'Password has been reset successfully'}, status=status.HTTP_200_OK)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        
        if not token:
            return Response({'error': 'Google token is required'}, status=status.HTTP_400_BAD_REQUEST)

        idinfo = verify_google_oauth_token(token)
        
        if not idinfo:
            return Response({'error': 'Invalid Google token'}, status=status.HTTP_400_BAD_REQUEST)

        email = idinfo.get('email')
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')
        
        if not email:
            return Response({'error': 'Email not provided by Google'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Check if user already exists
            user = User.objects.get(email=email)
            profile, _ = UserProfile.objects.get_or_create(user=user)
            
            # Since they authenticated with Google, their email is inherently verified
            if not profile.is_email_verified:
                profile.is_email_verified = True
                profile.save()
                
        except User.DoesNotExist:
            # Create a new user
            user = User.objects.create_user(
                username=email, # Use email as username
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            # Create the profile and mark email as verified
            profile = UserProfile.objects.create(user=user, is_email_verified=True)

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        }, status=status.HTTP_200_OK)
