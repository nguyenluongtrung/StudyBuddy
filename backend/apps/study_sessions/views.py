from rest_framework import viewsets

from .models import StudySession
from .serializers import StudySessionSerializer


class StudySessionViewSet(viewsets.ModelViewSet):
    serializer_class = StudySessionSerializer

    def get_queryset(self):
        return StudySession.objects.filter(owner=self.request.user).select_related("subject")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
