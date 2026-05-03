from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    age = models.PositiveIntegerField(null=True, blank=True)
    industry = models.CharField(max_length=100, blank=True)
    interests = models.TextField(blank=True)
    activity_type = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.username


class Goal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    current_tier = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def total_quests(self):
        return self.quests.count()

    @property
    def completed_quests(self):
        return self.quests.filter(is_completed=True).count()

    @property
    def progress_percentage(self):
        if self.total_quests == 0:
            return 0
        return int((self.completed_quests / self.total_quests) * 100)


class Quest(models.Model):
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='quests')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    tier_number = models.PositiveIntegerField()
    order = models.PositiveIntegerField()
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['tier_number', 'order']
        unique_together = ['goal', 'tier_number', 'order']

    def __str__(self):
        return f"{self.tier_number}-{self.order}: {self.title}"