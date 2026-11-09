from django.http import FileResponse, Http404
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .generation import GenerationFailed, generate_study_content, mark_generation_failed
from .models import FlashcardReview, FlashcardReviewSession, Question, QuizAttempt, QuizAttemptQuestion, StudyMaterial, StudySet
from .serializers import QuizAnswerSerializer, QuizSetupSerializer, StudySetSerializer


def serialize_attempt(attempt):
    completed = attempt.status == QuizAttempt.Status.COMPLETED
    return {
        "id": attempt.id,
        "status": attempt.status,
        "format": attempt.requested_format,
        "count": attempt.requested_count,
        "difficulty": attempt.requested_difficulty,
        "correct_count": attempt.correct_count if completed else None,
        "total_count": attempt.total_count if completed else None,
        "score_percent": attempt.score_percent if completed else None,
        "started_at": attempt.started_at,
        "completed_at": attempt.completed_at,
        "questions": [
            {
                "id": item.id, "position": item.position, "question": item.prompt,
                "answers": item.options, "selected_index": item.selected_index,
                "seconds_spent": item.seconds_spent,
                **({"correct_index": item.correct_index, "explanation": item.explanation,
                    "is_correct": item.is_correct} if completed else {}),
            }
            for item in attempt.items.all()
        ],
    }


class StudySetViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
                      mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = StudySetSerializer
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def get_queryset(self):
        return (StudySet.objects.filter(owner=self.request.user)
                .select_related("subject").prefetch_related("materials", "flashcards", "questions"))

    @action(detail=True, methods=["get", "post"], url_path="quiz-attempts")
    def quiz_attempts(self, request, pk=None):
        study_set = self.get_object()
        if request.method == "GET":
            attempt = study_set.quiz_attempts.prefetch_related("items").first()
            return Response(serialize_attempt(attempt) if attempt else None)

        serializer = QuizSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        config = serializer.validated_data
        questions = list(study_set.questions.all())
        if config["format"] == QuizAttempt.Format.MULTIPLE_CHOICE:
            questions = [question for question in questions if question.question_type == Question.Type.MULTIPLE_CHOICE]
        if not questions:
            return Response({"detail": "This study set has no questions in the requested format yet."}, status=status.HTTP_400_BAD_REQUEST)
        # Generated sets may have only balanced multiple choice questions. The chosen
        # difficulty is a preference; use the closest available questions.
        questions.sort(key=lambda question: (
            abs(question.difficulty - int(config["difficulty"])),
            question.question_type != Question.Type.MULTIPLE_CHOICE if config["format"] == QuizAttempt.Format.MIXED else False,
            question.id,
        ))
        with transaction.atomic():
            attempt = QuizAttempt.objects.create(
                study_set=study_set, requested_format=config["format"],
                requested_count=config["count"], requested_difficulty=config["difficulty"],
            )
            for position, question in enumerate(questions[:config["count"]]):
                wants_true_false = config["format"] == QuizAttempt.Format.TRUE_FALSE or (
                    config["format"] == QuizAttempt.Format.MIXED and position % 2 == 1
                )
                if wants_true_false and question.question_type != Question.Type.TRUE_FALSE:
                    # Turn a known correct answer into a true statement, or pair the
                    # prompt with a distractor to make a false one.
                    correct_statement = position % 2 == 0
                    option_index = question.correct_index if correct_statement else next(
                        index for index in range(len(question.options)) if index != question.correct_index
                    )
                    QuizAttemptQuestion.objects.create(
                        attempt=attempt, question=question, position=position,
                        prompt=f"True or false: {question.prompt} — {question.options[option_index]}",
                        question_type=Question.Type.TRUE_FALSE, difficulty=question.difficulty,
                        options=["True", "False"], correct_index=0 if correct_statement else 1,
                        explanation=question.explanation,
                    )
                else:
                    attempt.add_question(question, position)
        return Response(serialize_attempt(attempt), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path=r"quiz-attempts/(?P<attempt_id>\d+)")
    def quiz_attempt(self, request, pk=None, attempt_id=None):
        attempt = get_object_or_404(self.get_object().quiz_attempts.prefetch_related("items"), pk=attempt_id)
        return Response(serialize_attempt(attempt))

    @action(detail=True, methods=["post"], url_path=r"quiz-attempts/(?P<attempt_id>\d+)/answer")
    def quiz_answer(self, request, pk=None, attempt_id=None):
        attempt = get_object_or_404(self.get_object().quiz_attempts, pk=attempt_id)
        serializer = QuizAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if attempt.status != QuizAttempt.Status.IN_PROGRESS:
            return Response({"detail": "This quiz is already complete."}, status=status.HTTP_400_BAD_REQUEST)
        item = get_object_or_404(attempt.items, pk=serializer.validated_data["question_id"])
        if serializer.validated_data["selected_index"] >= len(item.options):
            return Response({"selected_index": ["Choose an available answer."]}, status=status.HTTP_400_BAD_REQUEST)
        item.selected_index = serializer.validated_data["selected_index"]
        item.seconds_spent = serializer.validated_data["seconds_spent"]
        item.save(update_fields={"selected_index", "seconds_spent"})
        return Response({"question_id": item.id, "selected_index": item.selected_index})

    @action(detail=True, methods=["post"], url_path=r"quiz-attempts/(?P<attempt_id>\d+)/finish")
    def quiz_finish(self, request, pk=None, attempt_id=None):
        with transaction.atomic():
            attempt = get_object_or_404(self.get_object().quiz_attempts.select_for_update(), pk=attempt_id)
            if attempt.status != QuizAttempt.Status.IN_PROGRESS:
                return Response({"detail": "This quiz is already complete."}, status=status.HTTP_400_BAD_REQUEST)
            if attempt.items.filter(selected_index__isnull=True).exists():
                return Response({"detail": "Answer every question before finishing."}, status=status.HTTP_400_BAD_REQUEST)
            attempt.finish()
        return Response(serialize_attempt(attempt))

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
