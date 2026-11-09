from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from tempfile import TemporaryDirectory
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

from pptx import Presentation
from pypdf import PdfWriter
from rest_framework.test import APIClient

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


class StudySetApiTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(username="api_owner", password="test-password")
        self.other = user_model.objects.create_user(username="api_other", password="test-password")
        self.subject = Subject.objects.create(owner=self.owner, name="Biology")
        self.other_subject = Subject.objects.create(owner=self.other, name="Chemistry")
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.form = {"title": "Cells", "subject_id": self.subject.pk, "notes": "Cells divide.",
                     "generate_flashcards": "true", "generate_quiz": "true"}

    def test_authentication_and_subject_ownership(self):
        response = self.client.post("/api/study-sets/", {**self.form, "subject_id": self.other_subject.pk})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(StudySet.objects.count(), 0)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/study-sets/").status_code, 401)

    def test_combined_source_and_owner_filtered_detail(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            upload = SimpleUploadedFile("notes.md", b"Mitochondria make ATP.", content_type="text/markdown")
            response = self.client.post("/api/study-sets/", {**self.form, "file": upload}, format="multipart")
            self.assertEqual(response.status_code, 201)
            study_set = StudySet.objects.get(pk=response.data["id"])
            self.assertEqual(study_set.materials.count(), 2)
            self.assertEqual(study_set.materials.get(kind="file").extracted_text, "Mitochondria make ATP.")
            self.client.force_authenticate(self.other)
            self.assertEqual(self.client.get(f"/api/study-sets/{study_set.pk}/").status_code, 404)
            self.assertEqual(len(self.client.get("/api/study-sets/").data), 0)

    def test_text_and_markdown_uploads(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            for filename in ("lecture.txt", "lecture.md"):
                with self.subTest(filename=filename):
                    upload = SimpleUploadedFile(filename, b"Readable source")
                    response = self.client.post("/api/study-sets/", {**self.form, "file": upload}, format="multipart")
                    self.assertEqual(response.status_code, 201)

    def test_powerpoint_upload_and_protected_download(self):
        deck = Presentation()
        slide = deck.slides.add_slide(deck.slide_layouts[5])
        slide.shapes.title.text = "Cell structure"
        stream = BytesIO()
        deck.save(stream)
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            upload = SimpleUploadedFile("lecture.pptx", stream.getvalue())
            response = self.client.post("/api/study-sets/", {**self.form, "file": upload}, format="multipart")
            self.assertEqual(response.status_code, 201)
            self.assertIn("Cell structure", StudySet.objects.get(pk=response.data["id"]).materials.get(kind="file").extracted_text)
            url = response.data["materials"][1]["download_url"]
            self.assertEqual(self.client.get(f"/api{url}").status_code, 200)
            self.client.force_authenticate(self.other)
            self.assertEqual(self.client.get(f"/api{url}").status_code, 404)

    def test_invalid_and_textless_pdf_uploads(self):
        for filename, contents in (("bad.exe", b"not allowed"), ("bad.pdf", b"invalid pdf")):
            with self.subTest(filename=filename):
                response = self.client.post("/api/study-sets/", {**self.form, "file": SimpleUploadedFile(filename, contents)}, format="multipart")
                self.assertEqual(response.status_code, 400)
                self.assertIn("file", response.data)
        pdf = BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        writer.write(pdf)
        response = self.client.post("/api/study-sets/", {**self.form, "file": SimpleUploadedFile("scan.pdf", pdf.getvalue())}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("paste the text", str(response.data).lower())
        self.assertEqual(StudySet.objects.count(), 0)

    @patch("apps.study_sets.extraction.PdfReader")
    def test_pdf_text_is_saved(self, reader):
        reader.return_value.pages = [SimpleNamespace(extract_text=lambda: "Cell membrane controls transport.")]
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post("/api/study-sets/", {**self.form, "file": SimpleUploadedFile("lecture.pdf", b"%PDF-1.4")}, format="multipart")
            self.assertEqual(response.status_code, 201)
            self.assertEqual(StudySet.objects.get(pk=response.data["id"]).materials.get(kind="file").extracted_text,
                             "Cell membrane controls transport.")

    def test_replacing_file_marks_content_outdated(self):
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            created = self.client.post("/api/study-sets/", {**self.form, "file": SimpleUploadedFile("old.txt", b"Old content")}, format="multipart")
            self.assertEqual(created.status_code, 201)
            updated = self.client.patch(f"/api/study-sets/{created.data['id']}/",
                                        {"file": SimpleUploadedFile("new.txt", b"New content")}, format="multipart")
            self.assertEqual(updated.status_code, 200)
            self.assertEqual(updated.data["generation_status"], "outdated")
            self.assertEqual(StudySet.objects.get(pk=created.data["id"]).materials.get(kind="file").extracted_text, "New content")

    @patch.dict("os.environ", {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "gemini-3.5-flash-lite"})
    @patch("apps.study_sets.generation.genai.Client")
    def test_generation_replaces_content_and_failure_can_retry(self, gemini_client):
        created = self.client.post("/api/study-sets/", self.form, format="multipart")
        self.assertEqual(created.status_code, 201)
        study_set_id = created.data["id"]
        url = f"/api/study-sets/{study_set_id}/generate/"
        gemini_client.return_value.models.generate_content.side_effect = RuntimeError("provider down")
        self.assertEqual(self.client.post(url).status_code, 502)
        self.assertEqual(StudySet.objects.get(pk=study_set_id).generation_status, "failed")
        output = SimpleNamespace(parsed={
            "flashcards": [{"front": "What is a cell?", "back": "Basic unit of life"}],
            "questions": [{"question": "What is a cell?", "answers": ["Unit of life", "Atom", "Tissue", "Organ"],
                           "correct": 0, "explanation": "Cells are the basic unit of life."}],
        })
        gemini_client.return_value.models.generate_content.side_effect = None
        gemini_client.return_value.models.generate_content.return_value = output
        self.assertEqual(self.client.post(url).status_code, 200)
        self.assertEqual(gemini_client.return_value.models.generate_content.call_args.kwargs["model"],
                         "gemini-3.5-flash-lite")
        self.assertEqual(self.client.post(url).status_code, 200)
        self.assertEqual(StudySet.objects.get(pk=study_set_id).flashcards.count(), 1)
        self.assertEqual(StudySet.objects.get(pk=study_set_id).questions.count(), 1)
        edited = self.client.patch(f"/api/study-sets/{study_set_id}/", {"notes": "Cells have membranes."}, format="multipart")
        self.assertEqual(edited.status_code, 200)
        self.assertEqual(edited.data["generation_status"], "outdated")
        self.assertEqual(StudySet.objects.get(pk=study_set_id).flashcards.count(), 1)
