from django.db import transaction
from rest_framework import serializers

from apps.subjects.models import Subject

from .extraction import MAX_SOURCE_CHARS, extract_upload
from .models import StudyMaterial, StudySet


class StudyMaterialSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = StudyMaterial
        fields = ("id", "title", "kind", "content", "extracted_text", "status", "created_at", "download_url")

    def get_download_url(self, material):
        if material.file:
            return f"/study-sets/{material.study_set_id}/materials/{material.id}/download/"
        return None


class StudySetSerializer(serializers.ModelSerializer):
    subject_id = serializers.PrimaryKeyRelatedField(source="subject", queryset=Subject.objects.all())
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    notes = serializers.CharField(write_only=True, required=False, allow_blank=True)
    file = serializers.FileField(write_only=True, required=False)
    materials = StudyMaterialSerializer(many=True, read_only=True)
    flashcards = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()

    class Meta:
        model = StudySet
        fields = (
            "id", "title", "subject_id", "subject_name", "topic", "course_code", "notes", "file",
            "generate_flashcards", "generate_quiz", "generation_status", "generation_error",
            "created_at", "updated_at", "materials", "flashcards", "questions",
        )
        read_only_fields = ("id", "generation_status", "generation_error", "created_at", "updated_at")

    def get_flashcards(self, study_set):
        return [{"id": card.id, "front": card.front, "back": card.back} for card in study_set.flashcards.all()]

    def get_questions(self, study_set):
        return [{"id": question.id, "question": question.prompt, "answers": question.options,
                 "correct": question.correct_index, "explanation": question.explanation}
                for question in study_set.questions.all()]

    def validate_subject_id(self, subject):
        if subject.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError("Choose one of your subjects.")
        return subject

    def validate(self, attrs):
        instance = self.instance
        cards = attrs.get("generate_flashcards", instance.generate_flashcards if instance else True)
        quiz = attrs.get("generate_quiz", instance.generate_quiz if instance else True)
        if not cards and not quiz:
            raise serializers.ValidationError("Choose flashcards, a quiz, or both.")
        notes = attrs.get("notes")
        upload = attrs.get("file")
        if upload:
            attrs["_file_text"] = extract_upload(upload)
        existing_notes = ""
        existing_file_text = ""
        if instance:
            existing_notes = next((item.content for item in instance.materials.all() if item.kind == StudyMaterial.Kind.TEXT), "")
            existing_file_text = next((item.extracted_text for item in instance.materials.all() if item.kind == StudyMaterial.Kind.FILE), "")
        combined = (notes if notes is not None else existing_notes) + "\n" + (attrs.get("_file_text") if upload else existing_file_text)
        if not combined.strip():
            raise serializers.ValidationError({"notes": "Paste notes or upload a file with readable text."})
        if len(combined) > MAX_SOURCE_CHARS:
            raise serializers.ValidationError({"notes": "Combined source text must be 50,000 characters or fewer."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        notes = validated_data.pop("notes", "").strip()
        upload = validated_data.pop("file", None)
        file_text = validated_data.pop("_file_text", "")
        study_set = StudySet.objects.create(owner=self.context["request"].user, **validated_data)
        if notes:
            StudyMaterial.objects.create(study_set=study_set, title="Pasted notes", kind=StudyMaterial.Kind.TEXT, content=notes)
        if upload:
            StudyMaterial.objects.create(study_set=study_set, title=upload.name[:200], kind=StudyMaterial.Kind.FILE,
                                         file=upload, extracted_text=file_text, status=StudyMaterial.Status.READY)
        return study_set

    @transaction.atomic
    def update(self, instance, validated_data):
        notes = validated_data.pop("notes", None)
        upload = validated_data.pop("file", None)
        file_text = validated_data.pop("_file_text", "")
        source_changed = notes is not None or upload is not None
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if source_changed:
            instance.generation_status = StudySet.GenerationStatus.OUTDATED
            instance.generation_error = ""
        instance.save()
        if notes is not None:
            old_text = instance.materials.filter(kind=StudyMaterial.Kind.TEXT).first()
            if notes.strip():
                if old_text:
                    old_text.content = notes.strip()
                    old_text.save()
                else:
                    StudyMaterial.objects.create(study_set=instance, title="Pasted notes", kind=StudyMaterial.Kind.TEXT, content=notes.strip())
            elif old_text:
                old_text.delete()
        if upload:
            instance.materials.filter(kind=StudyMaterial.Kind.FILE).delete()
            StudyMaterial.objects.create(study_set=instance, title=upload.name[:200], kind=StudyMaterial.Kind.FILE,
                                         file=upload, extracted_text=file_text, status=StudyMaterial.Status.READY)
        return instance
