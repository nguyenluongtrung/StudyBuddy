from rest_framework import serializers

from .models import StudySession


class StudySessionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = StudySession
        fields = ("id", "subject", "subject_name", "duration_minutes", "notes", "started_at", "created_at")
        read_only_fields = ("id", "subject_name", "created_at")
