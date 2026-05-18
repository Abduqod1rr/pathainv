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
    
    # Remove trailing commas more aggressively
    text = re.sub(r',(\s*[\]\}])', r'\1', text)
    # Remove any remaining commas before closing brackets
    text = re.sub(r',(\s*\])', ']', text)
    text = re.sub(r',(\s*\})', '}', text)
    
    # Try to fix common JSON issues
    # Remove multiple commas
    text = re.sub(r',{2,}', ',', text)
    
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
        
        api_keys = settings.GROQ_API_KEYS
        if not api_keys:
            return JsonResponse({'error': 'No API keys configured'}, status=500)
        
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

        # Try each API key in sequence
        last_error = None
        for api_key in api_keys:
            try:
                client = Groq(api_key=api_key)
                
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
                
                try:
                    result = json.loads(content)
                except json.JSONDecodeError as e:
                    logger.error(f"JSON parse failed after cleaning: {e}")
                    continue  # Try next key
                
                # Validate and normalize
                if not isinstance(result.get('tiers'), list):
                    continue  # Try next key
                
                logger.info(f"Generated roadmap for goal: {goal_title}")
                return JsonResponse(result)
                
            except Exception as e:
                error_str = str(e)
                # Check if it's a rate limit error (429)
                if '429' in error_str or 'rate_limit' in error_str.lower():
                    logger.warning(f"API key rate limited, trying next key")
                    last_error = 'All API keys rate limited'
                    continue  # Try next key
                last_error = e
                continue
        
        # All keys failed
        logger.error(f"All API keys failed. Last error: {last_error}")
        return JsonResponse({'error': 'All API keys failed. Please try again later.'}, status=500)
        
except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return JsonResponse({'error': 'Invalid JSON from AI', 'details': str(e)}, status=500)
    except Exception as e:
        logger.error(f"AI error: {e}")
        return JsonResponse({'error': str(e)}, status=500)
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return JsonResponse({'error': 'Invalid JSON from AI', 'details': str(e)}, status=500)
    except Exception as e:
        logger.error(f"AI error: {e}")
        return JsonResponse({'error': str(e)}, status=500)