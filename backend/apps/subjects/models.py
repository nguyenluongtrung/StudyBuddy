from django.conf import settings
from django.db import models


class Subject(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subjects")
    name = models.CharField(max_length=120)
    color = models.CharField(max_length=20, default="#ef8354")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["owner", "name"], name="unique_subject_per_user")]

    def __str__(self):
        return self.name
