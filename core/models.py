from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver


class User(AbstractUser):
    bio = models.TextField(blank=True)
    interests = models.TextField(blank=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.username


class Goal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=255)
    tiers = models.JSONField()
    current_tier = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class UserStats(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='stats')
    goals_completed = models.IntegerField(default=0)
    quests_completed = models.IntegerField(default=0)
    weekly_goals = models.IntegerField(default=0)
    weekly_quests = models.IntegerField(default=0)
    week_start = models.DateField(default=timezone.now)
    total_points = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username} Stats"


@receiver(post_save, sender=User)
def create_user_stats(sender, instance, created, **kwargs):
    if created:
        UserStats.objects.create(user=instance)