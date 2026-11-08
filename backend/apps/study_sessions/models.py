from django.conf import settings
from django.db import models

from apps.subjects.models import Subject


class StudySession(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_sessions")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="sessions")
    duration_minutes = models.PositiveIntegerField()
    notes = models.TextField(blank=True)
    started_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.subject.name} - {self.duration_minutes} minutes"
