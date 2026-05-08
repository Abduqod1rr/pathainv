from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    bio = models.TextField(blank=True)
    interests = models.TextField(blank=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.username