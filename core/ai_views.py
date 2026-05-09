from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from groq import Groq
from django.conf import settings
import json
import re
import logging

logger = logging.getLogger(__name__)

def clean_json_string(text):
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    
    text = re.sub(r',\s*\]', ']', text)
    text = re.sub(r',\s*\}', '}', text)
    
    return text

@csrf_exempt
def generate_roadmap(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        goal_title = data.get('title', '')
        profile = data.get('profile', {})
        
        if not goal_title:
            return JsonResponse({'error': 'No goal title'}, status=400)
        
        client = Groq(api_key=settings.GROQ_API_KEY)
        
        context_parts = []
        if profile.get('name'):
            context_parts.append(f"Name: {profile['name']}")
        if profile.get('bio'):
            context_parts.append(f"About: {profile['bio']}")
        if profile.get('interests'):
            context_parts.append(f"Interests: {profile['interests']}")
        
        context_str = '\n'.join(context_parts) if context_parts else 'No specific profile info'
        
        prompt = f"""You are an expert goal-achievement coach. Create a structured 10-tier learning roadmap.

User Profile:
{context_str}

Goal: "{goal_title}"

Rules:
- Exactly 10 tiers, absolute beginner to mastery
- Each tier has exactly 10 concrete, actionable quests
- Tier titles should be short and descriptive (e.g. "Tier 1: Foundations")
- Quests should be specific to the goal
- IMPORTANT: Output valid JSON only - NO trailing commas

Respond with ONLY valid JSON (no markdown), format:
{{"tiers":[
  {{"title":"Tier 1: Foundations","quests":["quest1","quest2","quest3","quest4","quest5","quest6","quest7","quest8","quest9","quest10"]}},
  {{"title":"Tier 2: Getting Started","quests":["quest1",...]}},
  ...10 tiers total...
]}}"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful AI that generates learning roadmaps."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=8000
        )
        
        content = response.choices[0].message.content.strip()
        content = clean_json_string(content)
        
        result = json.loads(content)
        
        # Validate and normalize
        if not isinstance(result.get('tiers'), list):
            raise ValueError('Invalid response format')
        
        logger.info(f"Generated roadmap for goal: {goal_title}")
        return JsonResponse(result)
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return JsonResponse({'error': 'Invalid JSON from AI', 'details': str(e)}, status=500)
    except Exception as e:
        logger.error(f"AI error: {e}")
        return JsonResponse({'error': str(e)}, status=500)