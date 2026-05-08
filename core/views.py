from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import login, logout, authenticate
from .models import User
import json


def index(request):
    return render(request, 'index.html')


def login_page(request):
    return render(request, 'login.html')


@csrf_exempt
def register(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        bio = data.get('bio', '')
        interests = data.get('interests', '')
        
        if not username or not password:
            return JsonResponse({'error': 'Username and password required'}, status=400)
        
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Username already exists'}, status=400)
        
        user = User.objects.create_user(
            username=username,
            password=password,
            bio=bio,
            interests=interests
        )
        
        login(request, user)
        
        return JsonResponse({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'bio': user.bio or '',
                'interests': user.interests or ''
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def login_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            login(request, user)
            return JsonResponse({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'bio': user.bio or '',
                    'interests': user.interests or ''
                }
            })
        else:
            return JsonResponse({'error': 'Invalid username or password'}, status=401)
            
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def logout_view(request):
    logout(request)
    return JsonResponse({'success': True})


def get_user(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'id': request.user.id,
            'username': request.user.username,
            'bio': request.user.bio or '',
            'interests': request.user.interests or ''
        })
    return JsonResponse({'error': 'Not authenticated'}, status=401)