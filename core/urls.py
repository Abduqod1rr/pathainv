from django.urls import path
from . import views
from . import ai_views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/register/', views.register, name='register'),
    path('api/login/', views.login_view, name='login'),
    path('api/logout/', views.logout_view, name='logout'),
    path('api/user/', views.get_user, name='get_user'),
    path('api/generate-roadmap/', ai_views.generate_roadmap, name='generate_roadmap'),
]