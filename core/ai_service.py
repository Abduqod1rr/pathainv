import json
import logging
from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    def generate_roadmap(self, user, goal_title):
        prompt = self._build_prompt(user, goal_title)

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a goal-setting assistant. Generate a roadmap of 100 concrete, specific quests divided into 10 tiers (10 quests per tier). Each quest should be a unique, actionable step. Return ONLY valid JSON array with no additional text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=8000,
            )

            content = response.choices[0].message.content
            logger.info(f"AI Response: {content[:500]}")

            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]

            quests = json.loads(content.strip())
            if len(quests) == 100:
                return quests
            else:
                logger.warning(f"AI returned {len(quests)} quests, expected 100")
                return self._fallback_roadmap(goal_title)

        except Exception as e:
            logger.error(f"AI Error: {e}")
            return self._fallback_roadmap(goal_title)

    def _build_prompt(self, user, goal_title):
        context = []
        if user.age:
            context.append(f"Age: {user.age}")
        if user.industry:
            context.append(f"Industry: {user.industry}")
        if user.interests:
            context.append(f"Interests: {user.interests}")
        if user.activity_type:
            context.append(f"Activity: {user.activity_type}")

        context_str = ", ".join(context) if context else "General context"

        return f"""Generate a roadmap for: "{goal_title}"
User context: {context_str}
Format: JSON array with 100 objects, each having "tier" (1-10), "order" (1-10), "title" (string).
Example: [{{"tier": 1, "order": 1, "title": "First step..."}}, ...]"""

    def _fallback_roadmap(self, goal_title):
        base_quests = [
            "Research and understand the fundamentals",
            "Set clear measurable objectives",
            "Create a detailed action plan",
            "Identify required resources",
            "Find a mentor or expert in the field",
            "Take an introductory course",
            "Practice basic skills daily",
            "Join a community of practitioners",
            "Read top 5 books on the topic",
            "Attend relevant events or workshops",
            "Build your first project",
            "Get feedback from experts",
            "Iterate and improve",
            "Network with professionals",
            "Create a portfolio",
            "Develop a unique approach",
            "Teach what you've learned",
            "Scale your efforts",
            "Measure your progress",
            "Celebrate milestones"
        ]
        quests = []
        for tier in range(1, 11):
            for order in range(1, 11):
                idx = ((tier - 1) * 10 + order - 1) % len(base_quests)
                quests.append({
                    "tier": tier,
                    "order": order,
                    "title": f"{base_quests[idx]} - {goal_title}"
                })
        return quests

    def decompose_quest(self, quest_title, user_context):
        prompt = f"""Break down this quest into 3-4 simpler sub-quests: "{quest_title}"
User context: {user_context}
Return JSON array with objects having "title" key."""

        try:
            response = self.client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[
                    {"role": "system", "content": "Break down complex tasks into simpler steps. Return ONLY valid JSON array."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500,
            )

            content = response.choices[0].message.content
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]

            return json.loads(content.strip())

        except Exception as e:
            print(f"AI Decompose Error: {e}")
            return [{"title": f"Part 1: {quest_title}"}, {"title": f"Part 2: {quest_title}"}]