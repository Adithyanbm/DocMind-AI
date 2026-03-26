from django.urls import path
from . import views

urlpatterns = [
    path('completions/', views.chat_completions, name='chat_completions'),
    path('save-to-drive/', views.save_to_drive, name='save_to_drive'),
    path('history/', views.get_chat_history, name='get_chat_history'),
    path('history/<str:file_id>/', views.get_chat_session, name='get_chat_session'),
    path('history/<str:file_id>/delete/', views.delete_chat_session, name='delete_chat_session'),
]
