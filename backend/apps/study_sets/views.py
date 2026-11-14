import secrets

from django.http import FileResponse, Http404
from django.db import transaction
from django.db.models import Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .generation import GenerationFailed, generate_study_content, mark_generation_failed
from .models import Flashcard, FlashcardReview, FlashcardReviewSession, FlashcardSchedule, Question, QuizAttempt, QuizAttemptQuestion, QuizChallenge, StudyMaterial, StudySet, StudySetParticipant
from .serializers import QuizAnswerSerializer, QuizSetupSerializer, StudySetSerializer


SHARE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


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


def serialize_challenge(challenge, user):
    own_attempt = challenge.challenger_attempt if challenge.challenger_id == user.id else challenge.opponent_attempt
    other_attempt = challenge.opponent_attempt if challenge.challenger_id == user.id else challenge.challenger_attempt
    return {
        "id": challenge.id, "study_set_id": challenge.study_set_id, "study_set_title": challenge.study_set.title,
        "challenger_id": challenge.challenger_id, "opponent_id": challenge.opponent_id,
        "challenger_name": challenge.challenger.username, "opponent_name": challenge.opponent.username,
        "is_challenger": challenge.challenger_id == user.id, "question_count": len(challenge.questions),
        "created_at": challenge.created_at,
        "my_attempt_id": own_attempt.id if own_attempt else None,
        "my_status": own_attempt.status if own_attempt else "not_started",
        "my_score": own_attempt.score_percent if own_attempt and own_attempt.status == QuizAttempt.Status.COMPLETED else None,
        "other_status": other_attempt.status if other_attempt else "not_started",
        "other_score": other_attempt.score_percent if own_attempt and other_attempt and
        own_attempt.status == QuizAttempt.Status.COMPLETED and other_attempt.status == QuizAttempt.Status.COMPLETED else None,
    }


class StudySetViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
                      mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = StudySetSerializer
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def get_queryset(self):
        shared_actions = {"list", "retrieve", "quiz_attempts", "quiz_attempt", "quiz_answer", "quiz_finish", "flashcard_progress", "challenge_players"}
        access = Q(owner=self.request.user)
        if self.action in shared_actions:
            access |= Q(memberships__user=self.request.user)
        return (StudySet.objects.filter(access).distinct()
                .select_related("subject", "owner").prefetch_related("materials", "flashcards", "questions"))

    @action(detail=False, methods=["get"], url_path="review-today")
    def review_today(self, request):
        accessible = StudySet.objects.filter(Q(owner=request.user) | Q(memberships__user=request.user)).values("pk")
        schedules = FlashcardSchedule.objects.filter(user=request.user, flashcard_id=OuterRef("pk"))
        due = FlashcardSchedule.objects.filter(user=request.user, flashcard_id=OuterRef("pk"),
                                               due_on__lte=timezone.localdate())
        cards = (Flashcard.objects.filter(study_set_id__in=accessible)
                 .annotate(has_schedule=Exists(schedules), is_due=Exists(due))
                 .filter(Q(has_schedule=False) | Q(is_due=True))
                 .select_related("study_set").order_by("study_set__title", "id"))
        return Response([{
            "id": card.id, "front": card.front, "back": card.back,
            "study_set_id": card.study_set_id, "study_set_title": card.study_set.title,
        } for card in cards])

    @action(detail=True, methods=["get", "post", "delete"], url_path="share-code")
    def share_code(self, request, pk=None):
        study_set = self.get_object()
        if request.method == "DELETE":
            study_set.share_code = None
            study_set.save(update_fields=["share_code"])
            return Response(status=status.HTTP_204_NO_CONTENT)
        if request.method == "POST" and study_set.share_code is None:
            while True:
                code = "".join(secrets.choice(SHARE_ALPHABET) for _ in range(12))
                if not StudySet.objects.filter(share_code=code).exists():
                    study_set.share_code = code
                    study_set.save(update_fields=["share_code"])
                    break
        return Response({"code": study_set.share_code})

    @action(detail=False, methods=["post"], url_path="join")
    def join(self, request):
        supplied = request.data.get("code")
        if not isinstance(supplied, str):
            return Response({"detail": "Enter a valid sharing code."}, status=status.HTTP_400_BAD_REQUEST)
        code = supplied.upper().replace("-", "").replace(" ", "").strip()
        if len(code) != 12 or any(char not in SHARE_ALPHABET for char in code):
            return Response({"detail": "Enter a valid sharing code."}, status=status.HTTP_400_BAD_REQUEST)
        study_set = StudySet.objects.filter(share_code=code).first()
        if study_set is None:
            return Response({"detail": "This sharing code is invalid or disabled."}, status=status.HTTP_400_BAD_REQUEST)
        if study_set.owner_id != request.user.id:
            StudySetParticipant.objects.get_or_create(study_set=study_set, user=request.user)
        return Response({"id": study_set.id})

    @action(detail=True, methods=["get"], url_path="challenge-players")
    def challenge_players(self, request, pk=None):
        study_set = self.get_object()
        players = ([study_set.owner] if study_set.owner_id != request.user.id else []) + [
            member.user for member in study_set.memberships.select_related("user").all()
            if member.user_id != request.user.id
        ]
        return Response([{"id": player.id, "username": player.username} for player in players])

    @action(detail=False, methods=["get", "post"], url_path="challenges")
    def challenges(self, request):
        if request.method == "GET":
            challenges = (QuizChallenge.objects.filter(Q(challenger=request.user) | Q(opponent=request.user))
                          .select_related("study_set", "challenger", "opponent", "challenger_attempt", "opponent_attempt"))
            return Response([serialize_challenge(challenge, request.user) for challenge in challenges])

        set_id = request.data.get("study_set_id")
        opponent_id = request.data.get("opponent_id")
        count = request.data.get("count", 5)
        if not str(set_id).isdigit() or not str(opponent_id).isdigit() or not str(count).isdigit():
            return Response({"detail": "Choose a study set, a friend, and a question count."}, status=status.HTTP_400_BAD_REQUEST)
        count = int(count)
        if count < 1 or count > 50:
            return Response({"detail": "Choose between 1 and 50 questions."}, status=status.HTTP_400_BAD_REQUEST)
        study_set = get_object_or_404(StudySet.objects.filter(
            Q(owner=request.user) | Q(memberships__user=request.user)).distinct(), pk=set_id)
        opponent_id = int(opponent_id)
        if opponent_id == request.user.id or not (study_set.owner_id == opponent_id or
                                                  study_set.memberships.filter(user_id=opponent_id).exists()):
            return Response({"detail": "Choose a friend who has joined this study set."}, status=status.HTTP_400_BAD_REQUEST)
        questions = list(study_set.questions.order_by("id")[:count])
        if not questions:
            return Response({"detail": "This study set needs quiz questions before you can challenge a friend."},
                            status=status.HTTP_400_BAD_REQUEST)
        snapshots = [{"prompt": question.prompt, "options": question.options, "correct_index": question.correct_index,
                      "explanation": question.explanation, "difficulty": question.difficulty,
                      "question_type": question.question_type} for question in questions]
        challenge = QuizChallenge.objects.create(study_set=study_set, challenger=request.user, opponent_id=opponent_id,
                                                 questions=snapshots)
        return Response(serialize_challenge(challenge, request.user), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path=r"challenges/(?P<challenge_id>\d+)/start")
    def challenge_start(self, request, challenge_id=None):
        with transaction.atomic():
            challenge = get_object_or_404(QuizChallenge.objects.select_for_update().filter(
                Q(challenger=request.user) | Q(opponent=request.user)), pk=challenge_id)
            field = "challenger_attempt" if challenge.challenger_id == request.user.id else "opponent_attempt"
            attempt = getattr(challenge, field)
            if attempt is None:
                attempt = QuizAttempt.objects.create(
                    study_set=challenge.study_set, user=request.user, requested_format=QuizAttempt.Format.MIXED,
                    requested_count=len(challenge.questions), requested_difficulty=Question.Difficulty.BALANCED,
                )
                for position, snapshot in enumerate(challenge.questions):
                    QuizAttemptQuestion.objects.create(
                        attempt=attempt, position=position, prompt=snapshot["prompt"],
                        question_type=snapshot["question_type"], difficulty=snapshot["difficulty"],
                        options=snapshot["options"], correct_index=snapshot["correct_index"],
                        explanation=snapshot["explanation"],
                    )
                setattr(challenge, field, attempt)
                challenge.save(update_fields=[field])
        return Response(serialize_attempt(attempt))

    @action(detail=True, methods=["get", "post"], url_path="quiz-attempts")
    def quiz_attempts(self, request, pk=None):
        study_set = self.get_object()
        if request.method == "GET":
            attempt = study_set.quiz_attempts.filter(user=request.user).prefetch_related("items").first()
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
                study_set=study_set, user=request.user, requested_format=config["format"],
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
        attempt = get_object_or_404(self.get_object().quiz_attempts.filter(user=request.user).prefetch_related("items"), pk=attempt_id)
        return Response(serialize_attempt(attempt))

    @action(detail=True, methods=["post"], url_path=r"quiz-attempts/(?P<attempt_id>\d+)/answer")
    def quiz_answer(self, request, pk=None, attempt_id=None):
        attempt = get_object_or_404(self.get_object().quiz_attempts.filter(user=request.user), pk=attempt_id)
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
            attempt = get_object_or_404(self.get_object().quiz_attempts.filter(user=request.user).select_for_update(), pk=attempt_id)
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
                session = (FlashcardReviewSession.objects.filter(study_set=study_set, user=request.user, completed_at__isnull=True)
                           .order_by("-started_at", "-id").first())
                if session is None:
                    session = FlashcardReviewSession.objects.create(study_set=study_set, user=request.user)
                FlashcardReview.record(session, card, feedback)
                schedule, _ = FlashcardSchedule.objects.select_for_update().get_or_create(
                    user=request.user, flashcard=card, defaults={"due_on": timezone.localdate()})
                schedule.apply_feedback(feedback)

        latest = {}
        reviews = (FlashcardReview.objects.filter(session__study_set=study_set, session__user=request.user, flashcard__study_set=study_set)
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
