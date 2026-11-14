from math import ceil

from django.db.models import Min, Prefetch, Q
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import ExamPlan, Flashcard, FlashcardReview, FlashcardSchedule, StudySet


class ExamPlanSerializer(serializers.ModelSerializer):
    study_set_ids = serializers.PrimaryKeyRelatedField(
        source="study_sets", many=True, allow_empty=False, queryset=StudySet.objects.none()
    )
    study_set_titles = serializers.SerializerMethodField()
    daily_progress = serializers.SerializerMethodField()

    class Meta:
        model = ExamPlan
        fields = ("id", "title", "exam_date", "study_set_ids", "study_set_titles", "daily_progress", "created_at")
        read_only_fields = ("id", "created_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        self.fields["study_set_ids"].child_relation.queryset = StudySet.objects.filter(
            Q(owner=user) | Q(memberships__user=user)
        ).distinct()

    def validate_exam_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("Choose today or a future exam date.")
        return value

    def create(self, validated_data):
        selected = validated_data.pop("study_sets")
        plan = ExamPlan.objects.create(owner=self.context["request"].user, **validated_data)
        plan.study_sets.set(selected)
        return plan

    def update(self, instance, validated_data):
        selected = validated_data.pop("study_sets", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if selected is not None:
            instance.study_sets.set(selected)
        return instance

    def get_study_set_titles(self, plan):
        return [study_set.title for study_set in plan.study_sets.all()]

    def get_daily_progress(self, plan):
        today = timezone.localdate()
        days_left = (plan.exam_date - today).days + 1
        set_ids = [study_set.id for study_set in plan.study_sets.all()]
        user = self.context["request"].user
        cards = Flashcard.objects.filter(study_set_id__in=set_ids)
        unseen = cards.exclude(schedules__user=user).count()
        first_reviewed_today = (FlashcardReview.objects.filter(
            session__user=user, flashcard__study_set_id__in=set_ids, flashcard__isnull=False
        ).values("flashcard_id").annotate(first_at=Min("reviewed_at"))
            .filter(first_at__date=today).count())
        due = (FlashcardSchedule.objects.filter(
            user=user, flashcard__study_set_id__in=set_ids, due_on__lte=today
        ).count())
        goal = min(10, ceil((unseen + first_reviewed_today) / days_left)) if days_left > 0 else 0
        return {
            "daily_goal": goal,
            "new_cards_today": min(first_reviewed_today, goal),
            "unseen_cards": unseen,
            "due_cards": due,
            "days_left": max(0, days_left),
        }


class ExamPlanViewSet(viewsets.ModelViewSet):
    serializer_class = ExamPlanSerializer
    permission_classes = (IsAuthenticated,)
    http_method_names = ("get", "post", "patch", "delete", "head", "options")

    def get_queryset(self):
        accessible_sets = StudySet.objects.filter(
            Q(owner=self.request.user) | Q(memberships__user=self.request.user)
        ).distinct()
        return ExamPlan.objects.filter(owner=self.request.user).prefetch_related(
            Prefetch("study_sets", queryset=accessible_sets)
        )
