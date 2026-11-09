from django.http import FileResponse, Http404
from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .generation import GenerationFailed, generate_study_content, mark_generation_failed
from .models import FlashcardReview, FlashcardReviewSession, StudyMaterial, StudySet
from .serializers import StudySetSerializer


class StudySetViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
                      mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = StudySetSerializer
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def get_queryset(self):
        return (StudySet.objects.filter(owner=self.request.user)
                .select_related("subject").prefetch_related("materials", "flashcards", "questions"))

    @action(detail=True, methods=["get", "post"], url_path="flashcard-progress")
    def flashcard_progress(self, request, pk=None):
        study_set = self.get_object()
        if request.method == "POST":
            card_id = request.data.get("flashcard_id")
            feedback = request.data.get("feedback")
            if feedback not in FlashcardReview.Feedback.values:
                return Response({"feedback": ["Choose known or learning."]}, status=status.HTTP_400_BAD_REQUEST)
            card = study_set.flashcards.filter(pk=card_id).first() if str(card_id).isdigit() else None
            if card is None:
                return Response({"flashcard_id": ["Choose a flashcard in this study set."]}, status=status.HTTP_400_BAD_REQUEST)
            with transaction.atomic():
                session = (FlashcardReviewSession.objects.filter(study_set=study_set, completed_at__isnull=True)
                           .order_by("-started_at", "-id").first())
                if session is None:
                    session = FlashcardReviewSession.objects.create(study_set=study_set)
                FlashcardReview.record(session, card, feedback)

        latest = {}
        reviews = (FlashcardReview.objects.filter(session__study_set=study_set, flashcard__study_set=study_set)
                   .order_by("-reviewed_at", "-id").values_list("flashcard_id", "feedback"))
        for card_id, feedback in reviews:
            latest.setdefault(card_id, feedback)
        return Response({"known_flashcard_ids": [card_id for card_id, feedback in latest.items()
                                                 if feedback == FlashcardReview.Feedback.KNOWN]})

    @action(detail=True, methods=["post"])
    def generate(self, request, pk=None):
        study_set = self.get_object()
        if study_set.generation_status == StudySet.GenerationStatus.READY:
            return Response(self.get_serializer(study_set).data)
        try:
            generate_study_content(study_set)
        except GenerationFailed as exc:
            mark_generation_failed(study_set, str(exc))
            return Response({"detail": study_set.generation_error}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(self.get_serializer(self.get_object()).data)

    @action(detail=True, methods=["get"], url_path=r"materials/(?P<material_id>[^/.]+)/download")
    def download(self, request, pk=None, material_id=None):
        study_set = self.get_object()
        material = study_set.materials.filter(pk=material_id, kind=StudyMaterial.Kind.FILE).first()
        if not material or not material.file:
            raise Http404
        return FileResponse(material.file.open("rb"), as_attachment=True, filename=material.title)
