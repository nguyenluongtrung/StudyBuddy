from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.subjects.models import Subject


class ValidatedModel(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class StudySet(ValidatedModel):
    class GenerationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"
        OUTDATED = "outdated", "Outdated"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_sets")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="study_sets")
    title = models.CharField(max_length=200)
    topic = models.CharField(max_length=120, blank=True)
    course_code = models.CharField(max_length=40, blank=True)
    generate_flashcards = models.BooleanField(default=True)
    generate_quiz = models.BooleanField(default=True)
    generation_status = models.CharField(max_length=8, choices=GenerationStatus.choices, default=GenerationStatus.PENDING)
    generation_error = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        indexes = [models.Index(fields=["owner", "-updated_at"], name="study_set_owner_recent_idx")]

    def clean(self):
        if self.owner_id and self.subject_id and self.subject.owner_id != self.owner_id:
            raise ValidationError({"subject": "Subject must belong to the study set owner."})

    def __str__(self):
        return self.title


class StudyMaterial(ValidatedModel):
    class Kind(models.TextChoices):
        TEXT = "text", "Pasted text"
        FILE = "file", "Uploaded file"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    study_set = models.ForeignKey(StudySet, on_delete=models.CASCADE, related_name="materials")
    title = models.CharField(max_length=200)
    kind = models.CharField(max_length=8, choices=Kind.choices)
    content = models.TextField(blank=True)
    file = models.FileField(upload_to="study-materials/%Y/%m/", blank=True)
    extracted_text = models.TextField(blank=True)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.PENDING)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]

    def clean(self):
        if self.kind == self.Kind.TEXT:
            if not self.content.strip():
                raise ValidationError({"content": "Pasted text cannot be empty."})
            if self.file:
                raise ValidationError({"file": "Pasted text cannot include a file."})
        elif self.kind == self.Kind.FILE:
            if not self.file:
                raise ValidationError({"file": "An uploaded material needs a file."})
            if self.content:
                raise ValidationError({"content": "Uploaded material cannot include pasted text."})

    def save(self, *args, **kwargs):
        if self.kind == self.Kind.TEXT:
            self.extracted_text = self.content
            self.status = self.Status.READY
            self.error_message = ""
            if kwargs.get("update_fields") is not None:
                kwargs["update_fields"] = set(kwargs["update_fields"]) | {
                    "extracted_text", "status", "error_message"
                }
        return super().save(*args, **kwargs)


class GeneratedContent(ValidatedModel):
    class Origin(models.TextChoices):
        MANUAL = "manual", "Manual"
        AI = "ai", "AI"

    study_set = models.ForeignKey(StudySet, on_delete=models.CASCADE)
    source_material = models.ForeignKey(StudyMaterial, on_delete=models.SET_NULL, null=True, blank=True)
    origin = models.CharField(max_length=8, choices=Origin.choices, default=Origin.AI)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def clean(self):
        if self.source_material_id and self.study_set_id and self.source_material.study_set_id != self.study_set_id:
            raise ValidationError({"source_material": "Material must belong to the same study set."})


class Question(GeneratedContent):
    class Type(models.TextChoices):
        MULTIPLE_CHOICE = "multiple_choice", "Multiple choice"
        TRUE_FALSE = "true_false", "True or false"

    class Difficulty(models.IntegerChoices):
        FUNDAMENTAL = 1, "Fundamental"
        BALANCED = 2, "Balanced"
        CHALLENGING = 3, "Challenging"

    study_set = models.ForeignKey(StudySet, on_delete=models.CASCADE, related_name="questions")
    source_material = models.ForeignKey(
        StudyMaterial, on_delete=models.SET_NULL, null=True, blank=True, related_name="questions"
    )
    prompt = models.TextField()
    question_type = models.CharField(max_length=20, choices=Type.choices)
    difficulty = models.PositiveSmallIntegerField(choices=Difficulty.choices)
    options = models.JSONField()
    correct_index = models.PositiveSmallIntegerField()
    explanation = models.TextField()

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["study_set", "question_type", "difficulty"], name="question_set_type_diff_idx")]

    def clean(self):
        super().clean()
        validate_options(self.question_type, self.options, self.correct_index)


class Flashcard(GeneratedContent):
    study_set = models.ForeignKey(StudySet, on_delete=models.CASCADE, related_name="flashcards")
    source_material = models.ForeignKey(
        StudyMaterial, on_delete=models.SET_NULL, null=True, blank=True, related_name="flashcards"
    )
    front = models.TextField()
    back = models.TextField()

    class Meta:
        ordering = ["created_at", "id"]


def validate_options(question_type, options, correct_index):
    if not isinstance(options, list) or len(options) < 2 or any(
        not isinstance(option, str) or not option.strip() for option in options
    ):
        raise ValidationError({"options": "Provide at least two nonempty answer options."})
    if question_type == Question.Type.TRUE_FALSE and options != ["True", "False"]:
        raise ValidationError({"options": "True/false options must be ['True', 'False']."})
    if not isinstance(correct_index, int) or isinstance(correct_index, bool) or not 0 <= correct_index < len(options):
        raise ValidationError({"correct_index": "Correct option index is out of range."})


class QuizAttempt(ValidatedModel):
    class Format(models.TextChoices):
        MULTIPLE_CHOICE = "multiple_choice", "Multiple choice"
        TRUE_FALSE = "true_false", "True or false"
        MIXED = "mixed", "Mixed"

    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"

    study_set = models.ForeignKey(StudySet, on_delete=models.CASCADE, related_name="quiz_attempts")
    requested_format = models.CharField(max_length=20, choices=Format.choices)
    requested_count = models.PositiveSmallIntegerField()
    requested_difficulty = models.PositiveSmallIntegerField(choices=Question.Difficulty.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.IN_PROGRESS)
    correct_count = models.PositiveSmallIntegerField(default=0)
    total_count = models.PositiveSmallIntegerField(default=0)
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at", "-id"]
        indexes = [models.Index(fields=["study_set", "-started_at"], name="quiz_attempt_set_recent_idx")]

    def clean(self):
        if self.requested_count is not None and self.requested_count < 1:
            raise ValidationError({"requested_count": "Choose at least one question."})
        if self.status == self.Status.COMPLETED and not self.completed_at:
            raise ValidationError({"completed_at": "Completed attempts need a completion time."})
        if self.completed_at and self.completed_at < self.started_at:
            raise ValidationError({"completed_at": "Completion cannot precede the start."})
        if self.correct_count > self.total_count:
            raise ValidationError({"correct_count": "Correct count cannot exceed total count."})

    @property
    def score_percent(self):
        return round(self.correct_count * 100 / self.total_count) if self.total_count else 0

    def add_question(self, question, position):
        if self.status != self.Status.IN_PROGRESS:
            raise ValidationError("Cannot add questions to a completed attempt.")
        if question.study_set_id != self.study_set_id:
            raise ValidationError("Question must belong to the attempt's study set.")
        return QuizAttemptQuestion.objects.create(
            attempt=self, question=question, position=position, prompt=question.prompt,
            question_type=question.question_type, difficulty=question.difficulty,
            options=list(question.options), correct_index=question.correct_index,
            explanation=question.explanation,
        )

    @transaction.atomic
    def finish(self):
        if self.status != self.Status.IN_PROGRESS:
            raise ValidationError("Attempt is already completed.")
        questions = list(self.items.all())
        if not questions:
            raise ValidationError("Attempt needs at least one question.")
        if len(questions) > self.requested_count:
            raise ValidationError("Attempt exceeds its requested question count.")
        self.total_count = len(questions)
        self.correct_count = sum(item.is_correct is True for item in questions)
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save()


class QuizAttemptQuestion(ValidatedModel):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name="items")
    question = models.ForeignKey(Question, on_delete=models.SET_NULL, null=True, blank=True, related_name="attempt_items")
    position = models.PositiveSmallIntegerField()
    prompt = models.TextField()
    question_type = models.CharField(max_length=20, choices=Question.Type.choices)
    difficulty = models.PositiveSmallIntegerField(choices=Question.Difficulty.choices)
    options = models.JSONField()
    correct_index = models.PositiveSmallIntegerField()
    explanation = models.TextField()
    selected_index = models.PositiveSmallIntegerField(null=True, blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    seconds_spent = models.PositiveIntegerField(default=0)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["position", "id"]
        constraints = [models.UniqueConstraint(fields=["attempt", "position"], name="unique_quiz_attempt_position")]

    def clean(self):
        if self.question_id and self.attempt_id and self.question.study_set_id != self.attempt.study_set_id:
            raise ValidationError({"question": "Question must belong to the attempt's study set."})
        validate_options(self.question_type, self.options, self.correct_index)
        if self.selected_index is not None and self.selected_index >= len(self.options):
            raise ValidationError({"selected_index": "Selected option index is out of range."})
        if self.attempt_id and self.attempt.status == QuizAttempt.Status.COMPLETED:
            raise ValidationError("Cannot change questions on a completed attempt.")

    def save(self, *args, **kwargs):
        self.is_correct = None if self.selected_index is None else self.selected_index == self.correct_index
        if self.selected_index is not None and not self.answered_at:
            self.answered_at = timezone.now()
        if kwargs.get("update_fields") is not None:
            kwargs["update_fields"] = set(kwargs["update_fields"]) | {"is_correct", "answered_at"}
        return super().save(*args, **kwargs)


class FlashcardReviewSession(ValidatedModel):
    study_set = models.ForeignKey(StudySet, on_delete=models.CASCADE, related_name="flashcard_sessions")
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at", "-id"]
        indexes = [models.Index(fields=["study_set", "-started_at"], name="flash_session_set_recent_idx")]

    def clean(self):
        if self.completed_at and self.completed_at < self.started_at:
            raise ValidationError({"completed_at": "Completion cannot precede the start."})


class FlashcardReview(ValidatedModel):
    class Feedback(models.TextChoices):
        KNOWN = "known", "Known"
        LEARNING = "learning", "Learning"

    session = models.ForeignKey(FlashcardReviewSession, on_delete=models.CASCADE, related_name="reviews")
    flashcard = models.ForeignKey(Flashcard, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviews")
    front = models.TextField()
    back = models.TextField()
    feedback = models.CharField(max_length=8, choices=Feedback.choices)
    reviewed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["reviewed_at", "id"]
        indexes = [models.Index(fields=["session", "reviewed_at"], name="flash_review_session_time_idx")]

    def clean(self):
        if self.flashcard_id and self.session_id and self.flashcard.study_set_id != self.session.study_set_id:
            raise ValidationError({"flashcard": "Flashcard must belong to the review session's study set."})

    @classmethod
    def record(cls, session, flashcard, feedback):
        return cls.objects.create(
            session=session, flashcard=flashcard, front=flashcard.front,
            back=flashcard.back, feedback=feedback,
        )
