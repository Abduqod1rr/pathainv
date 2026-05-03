from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from groq import Groq
from django.conf import settings
import json
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
def generate_roadmap(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        goal_title = data.get('title', '')
        user_context = data.get('context', {})
        
        if not goal_title:
            return JsonResponse({'error': 'No goal title'}, status=400)
        
        client = Groq(api_key=settings.GROQ_API_KEY)
        
        context_parts = []
        if user_context.get('age'):
            context_parts.append(f"Age: {user_context['age']}")
        if user_context.get('industry'):
            context_parts.append(f"Industry: {user_context['industry']}")
        
        context_str = ', '.join(context_parts) if context_parts else 'General'
        
        prompt = f"""Generate 100 quests for "{goal_title}". 
Format: [{{"tier":1,"order":1,"title":"..."}}]
10 per tier, 10 tiers."""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Goal roadmap generator. Return ONLY valid JSON array."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=6000
        )
        
        content = response.choices[0].message.content.strip()
        
        # Extract JSON
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        quests = json.loads(content.strip())
        
        # Ensure we have 100 quests
        if len(quests) < 100:
            # Pad with generic quests
            while len(quests) < 100:
                tier = (len(quests) // 10) + 1
                order = (len(quests) % 10) + 1
                quests.append({"tier": tier, "order": order, "title": f"Continue working on {goal_title}"})
        
        logger.info(f"Generated {len(quests)} quests for goal: {goal_title}")
        return JsonResponse({'quests': quests[:100]})
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return JsonResponse({'error': 'Invalid JSON from AI', 'details': str(e)}, status=500)
    except Exception as e:
        logger.error(f"AI error: {e}")
        return JsonResponse({'error': str(e)}, status=500)