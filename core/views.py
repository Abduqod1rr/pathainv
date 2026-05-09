from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import login, logout, authenticate
from .models import User, Goal
import json


def index(request):
    if not request.user.is_authenticated:
        from django.shortcuts import redirect
        return redirect('login_page')
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


def get_goals(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    
    goals = Goal.objects.filter(user=request.user).values('id', 'title', 'tiers', 'created_at', 'updated_at')
    return JsonResponse({'goals': list(goals)})


@csrf_exempt
def create_goal(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        title = data.get('title', '').strip()
        tiers = data.get('tiers', [])
        
        if not title:
            return JsonResponse({'error': 'Title required'}, status=400)
        
        goal = Goal.objects.create(
            user=request.user,
            title=title,
            tiers=tiers
        )
        
        return JsonResponse({
            'success': True,
            'goal': {
                'id': goal.id,
                'title': goal.title,
                'tiers': goal.tiers,
                'created_at': goal.created_at.isoformat(),
                'updated_at': goal.updated_at.isoformat()
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def update_goal(request, goal_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    
    if request.method != 'PUT':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        goal = Goal.objects.get(id=goal_id, user=request.user)
        data = json.loads(request.body)
        
        if 'title' in data:
            goal.title = data['title']
        if 'tiers' in data:
            goal.tiers = data['tiers']
        
        goal.save()
        
        return JsonResponse({
            'success': True,
            'goal': {
                'id': goal.id,
                'title': goal.title,
                'tiers': goal.tiers,
                'created_at': goal.created_at.isoformat(),
                'updated_at': goal.updated_at.isoformat()
            }
        })
    except Goal.DoesNotExist:
        return JsonResponse({'error': 'Goal not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def delete_goal(request, goal_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        goal = Goal.objects.get(id=goal_id, user=request.user)
        goal.delete()
        return JsonResponse({'success': True})
    except Goal.DoesNotExist:
        return JsonResponse({'error': 'Goal not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)