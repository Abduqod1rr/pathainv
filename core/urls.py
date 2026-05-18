from django.urls import path
from . import views
from . import ai_views

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login_page, name='login_page'),
    path('register/', views.login_page, name='register_page'),
    path('api/register/', views.register, name='register'),
    path('api/login/', views.login_view, name='login'),
    path('api/logout/', views.logout_view, name='logout'),
    path('api/user/', views.get_user, name='get_user'),
    path('api/goals/', views.get_goals, name='get_goals'),
    path('api/goals/create/', views.create_goal, name='create_goal'),
    path('api/goals/<int:goal_id>/', views.update_goal, name='update_goal'),
    path('api/goals/<int:goal_id>/delete/', views.delete_goal, name='delete_goal'),
    path('api/generate-roadmap/', ai_views.generate_roadmap, name='generate_roadmap'),
    path('api/leaderboard/', views.get_leaderboard, name='leaderboard'),
]