from datetime import timedelta

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


def backfill_schedules(apps, schema_editor):
    Review = apps.get_model("study_sets", "FlashcardReview")
    Schedule = apps.get_model("study_sets", "FlashcardSchedule")
    seen = set()
    reviews = Review.objects.filter(flashcard__isnull=False).order_by("-reviewed_at", "-id")
    for review in reviews.iterator():
        key = (review.session.user_id, review.flashcard_id)
        if key in seen:
            continue
        seen.add(key)
        reviewed_on = timezone.localtime(review.reviewed_at).date()
        days = 3 if review.feedback == "known" else 1
        Schedule.objects.create(
            user_id=key[0], flashcard_id=key[1],
            due_on=reviewed_on + timedelta(days=days),
            known_streak=1 if review.feedback == "known" else 0,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("study_sets", "0005_quiz_challenge"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FlashcardSchedule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("due_on", models.DateField()),
                ("known_streak", models.PositiveSmallIntegerField(default=0)),
                ("flashcard", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="schedules", to="study_sets.flashcard")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="flashcard_schedules", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name="flashcardschedule",
            constraint=models.UniqueConstraint(fields=("user", "flashcard"), name="unique_flashcard_schedule"),
        ),
        migrations.AddIndex(
            model_name="flashcardschedule",
            index=models.Index(fields=["user", "due_on"], name="flash_schedule_user_due_idx"),
        ),
        migrations.RunPython(backfill_schedules, migrations.RunPython.noop),
    ]
