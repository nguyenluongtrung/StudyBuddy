from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from tempfile import TemporaryDirectory

from apps.subjects.models import Subject

from .models import (
    Flashcard, FlashcardReview, FlashcardReviewSession, Question, QuizAttempt,
    QuizAttemptQuestion, StudyMaterial, StudySet,
)


class StudySetModelTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(username="owner", password="test-password")
        self.other = user_model.objects.create_user(username="other", password="test-password")
        self.subject = Subject.objects.create(owner=self.owner, name="Biology")
        self.other_subject = Subject.objects.create(owner=self.other, name="Chemistry")
        self.study_set = StudySet.objects.create(owner=self.owner, subject=self.subject, title="Cells")

    def question(self, **overrides):
        values = {
            "study_set": self.study_set,
            "prompt": "What is a cell?",
            "question_type": Question.Type.MULTIPLE_CHOICE,
            "difficulty": Question.Difficulty.FUNDAMENTAL,
            "options": ["Unit of life", "A molecule"],
            "correct_index": 0,
            "explanation": "Cells are the basic unit of life.",
        }
        values.update(overrides)
        return Question.objects.create(**values)

    def test_subject_and_source_must_match_study_set(self):
        with self.assertRaises(ValidationError):
            StudySet.objects.create(owner=self.owner, subject=self.other_subject, title="Invalid")

        other_set = StudySet.objects.create(owner=self.other, subject=self.other_subject, title="Other")
        material = StudyMaterial.objects.create(
            study_set=other_set, title="Notes", kind=StudyMaterial.Kind.TEXT, content="Atoms"
        )
        with self.assertRaises(ValidationError):
            self.question(source_material=material)

    def test_material_and_both_question_formats(self):
        material = StudyMaterial.objects.create(
            study_set=self.study_set, title="Notes", kind=StudyMaterial.Kind.TEXT, content="Cells divide."
        )
        self.assertEqual(material.extracted_text, "Cells divide.")
        self.assertEqual(material.status, StudyMaterial.Status.READY)
        material.content = "Cells grow."
        material.save(update_fields={"content"})
        material.refresh_from_db()
        self.assertEqual(material.extracted_text, "Cells grow.")
        self.question(source_material=material)
        self.question(
            prompt="Cells divide.", question_type=Question.Type.TRUE_FALSE,
            options=["True", "False"], correct_index=0,
        )
        with self.assertRaises(ValidationError):
            self.question(question_type=Question.Type.TRUE_FALSE)
        with self.assertRaises(ValidationError):
            self.question(correct_index=4)

    def test_uploaded_material_starts_pending_extraction(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            material = StudyMaterial.objects.create(
                study_set=self.study_set, title="Lecture", kind=StudyMaterial.Kind.FILE,
                file=SimpleUploadedFile("lecture.txt", b"Study notes"),
            )
            self.assertTrue(material.file.name.startswith("study-materials/"))
            self.assertEqual(material.status, StudyMaterial.Status.PENDING)
            self.assertEqual(material.extracted_text, "")
            self.assertTrue(material.file.storage.exists(material.file.name))
            with self.captureOnCommitCallbacks(execute=True):
                self.study_set.delete()
            self.assertFalse(material.file.storage.exists(material.file.name))

    def test_quiz_scoring_and_historical_snapshot(self):
        question = self.question()
        attempt = QuizAttempt.objects.create(
            study_set=self.study_set, requested_format=QuizAttempt.Format.MULTIPLE_CHOICE,
            requested_count=1, requested_difficulty=Question.Difficulty.FUNDAMENTAL,
        )
        item = attempt.add_question(question, position=0)
        item.selected_index = 0
        item.seconds_spent = 12
        item.save(update_fields={"selected_index", "seconds_spent"})
        item.refresh_from_db()
        attempt.finish()

        question.prompt = "Changed question"
        question.explanation = "Changed explanation"
        question.save()
        item.refresh_from_db()
        self.assertEqual((attempt.correct_count, attempt.total_count, attempt.score_percent), (1, 1, 100))
        self.assertEqual(item.prompt, "What is a cell?")
        self.assertEqual(item.explanation, "Cells are the basic unit of life.")
        self.assertTrue(item.is_correct)
        with self.assertRaises(ValidationError):
            item.save()

    def test_attempt_position_is_unique(self):
        question = self.question()
        attempt = QuizAttempt.objects.create(
            study_set=self.study_set, requested_format=QuizAttempt.Format.MIXED,
            requested_count=2, requested_difficulty=Question.Difficulty.BALANCED,
        )
        attempt.add_question(question, position=0)
        with self.assertRaises((ValidationError, IntegrityError)):
            with transaction.atomic():
                attempt.add_question(question, position=0)

    def test_flashcard_reviews_and_set_deletion_cascade(self):
        card = Flashcard.objects.create(study_set=self.study_set, front="Cell?", back="Unit of life")
        first = FlashcardReviewSession.objects.create(study_set=self.study_set)
        second = FlashcardReviewSession.objects.create(study_set=self.study_set)
        FlashcardReview.record(first, card, FlashcardReview.Feedback.LEARNING)
        FlashcardReview.record(second, card, FlashcardReview.Feedback.KNOWN)
        card.front = "Changed"
        card.save()
        self.assertEqual(list(FlashcardReview.objects.values_list("front", flat=True)), ["Cell?", "Cell?"])

        other_set = StudySet.objects.create(owner=self.other, subject=self.other_subject, title="Other")
        other_card = Flashcard.objects.create(study_set=other_set, front="Atom?", back="Matter")
        with self.assertRaises(ValidationError):
            FlashcardReview.record(first, other_card, FlashcardReview.Feedback.KNOWN)

        self.study_set.delete()
        self.assertFalse(FlashcardReviewSession.objects.exists())
        self.assertFalse(FlashcardReview.objects.exists())
        self.assertFalse(Flashcard.objects.filter(pk=card.pk).exists())
        self.assertTrue(Flashcard.objects.filter(pk=other_card.pk).exists())
