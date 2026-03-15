from django.urls import path
from . import views

urlpatterns = [
    path('completions/', views.chat_completions, name='chat_completions'),
    path('save-to-drive/', views.save_to_drive, name='save_to_drive'),
]
