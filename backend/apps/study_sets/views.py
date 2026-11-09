from django.http import FileResponse, Http404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .generation import GenerationFailed, generate_study_content, mark_generation_failed
from .models import StudyMaterial, StudySet
from .serializers import StudySetSerializer


class StudySetViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
                      mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = StudySetSerializer
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def get_queryset(self):
        return (StudySet.objects.filter(owner=self.request.user)
                .select_related("subject").prefetch_related("materials", "flashcards", "questions"))

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
