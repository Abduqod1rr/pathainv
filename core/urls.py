from django.urls import path
from . import views
from . import ai_views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/generate-roadmap/', ai_views.generate_roadmap, name='generate_roadmap'),
]