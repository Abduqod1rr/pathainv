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
    
    goals = Goal.objects.filter(user=request.user).values('id', 'title', 'tiers', 'current_tier', 'created_at', 'updated_at')
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
            tiers=tiers,
            current_tier=0
        )
        
        return JsonResponse({
            'success': True,
            'goal': {
                'id': goal.id,
                'title': goal.title,
                'tiers': goal.tiers,
                'current_tier': goal.current_tier,
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
        if 'current_tier' in data:
            goal.current_tier = data['current_tier']
        if 'tiers' in data:
            # Count completed quests before update
            old_completed = sum(
                sum(1 for q in t.get('quests', []) if q.get('completed'))
                for t in goal.tiers
            )
            
            goal.tiers = data['tiers']
            
            # Count completed quests after update
            new_completed = sum(
                sum(1 for q in t.get('quests', []) if q.get('completed'))
                for t in data['tiers']
            )
            
            # If new quests completed, update stats
            if new_completed > old_completed:
                diff = new_completed - old_completed
                try:
                    stats = request.user.stats
                    stats.quests_completed += diff
                    stats.weekly_quests += diff
                    stats.total_points += diff * 10
                    
                    # Check if goal is fully completed
                    total_quests = sum(len(t.get('quests', [])) for t in data['tiers'])
                    if new_completed == total_quests and total_quests > 0:
                        # Goal completed!
                        stats.goals_completed += 1
                        stats.weekly_goals += 1
                        stats.total_points += 100
                    
                    stats.save()
                except:
                    pass
        
        goal.save()
        
        return JsonResponse({
            'success': True,
            'goal': {
                'id': goal.id,
                'title': goal.title,
                'tiers': goal.tiers,
                'current_tier': goal.current_tier,
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


from django.utils import timezone
from datetime import timedelta


def get_leaderboard(request):
    from .models import UserStats
    
    # Get start of week (Monday)
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    
    # Update weekly stats for all users if week changed
    stats = UserStats.objects.all()
    for s in stats:
        if s.week_start < week_start:
            s.weekly_goals = 0
            s.weekly_quests = 0
            s.week_start = week_start
            s.save()
    
    # All-time leaderboard
    all_time = UserStats.objects.select_related('user').order_by('-goals_completed', '-quests_completed')[:20]
    all_time_data = [
        {
            'username': s.user.username,
            'goals_completed': s.goals_completed,
            'quests_completed': s.quests_completed,
            'points': s.total_points
        }
        for s in all_time
    ]
    
    # Weekly leaderboard
    weekly = UserStats.objects.select_related('user').order_by('-weekly_goals', '-weekly_quests')[:20]
    weekly_data = [
        {
            'username': s.user.username,
            'goals_completed': s.weekly_goals,
            'quests_completed': s.weekly_quests,
            'points': s.weekly_goals * 100 + s.weekly_quests * 10
        }
        for s in weekly
    ]
    
    return JsonResponse({
        'all_time': all_time_data,
        'weekly': weekly_data
    })


def update_stats_on_quest_complete(user):
    from .models import UserStats
    try:
        stats = user.stats
        stats.quests_completed += 1
        stats.weekly_quests += 1
        stats.total_points += 10
        stats.save()
    except UserStats.DoesNotExist:
        pass


def update_stats_on_goal_complete(user):
    from .models import UserStats
    try:
        stats = user.stats
        stats.goals_completed += 1
        stats.weekly_goals += 1
        stats.total_points += 100
        stats.save()
    except UserStats.DoesNotExist:
        pass