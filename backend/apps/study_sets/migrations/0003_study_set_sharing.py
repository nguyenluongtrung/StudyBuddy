from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def assign_existing_progress(apps, schema_editor):
    QuizAttempt = apps.get_model("study_sets", "QuizAttempt")
    FlashcardReviewSession = apps.get_model("study_sets", "FlashcardReviewSession")
    for attempt in QuizAttempt.objects.select_related("study_set").all().iterator():
        attempt.user_id = attempt.study_set.owner_id
        attempt.save(update_fields=["user"])
    for session in FlashcardReviewSession.objects.select_related("study_set").all().iterator():
        session.user_id = session.study_set.owner_id
        session.save(update_fields=["user"])


class Migration(migrations.Migration):
    dependencies = [
        ("study_sets", "0002_generation_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(model_name="studyset", name="share_token", field=models.UUIDField(blank=True, default=None, null=True, unique=True)),
        migrations.CreateModel(
            name="StudySetParticipant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("joined_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("study_set", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="study_sets.studyset")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="study_set_memberships", to=settings.AUTH_USER_MODEL)),
            ],
            options={"constraints": [models.UniqueConstraint(fields=("study_set", "user"), name="unique_study_set_participant")]},
        ),
        migrations.AddField(model_name="studyset", name="participants", field=models.ManyToManyField(related_name="shared_study_sets", through="study_sets.StudySetParticipant", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="quizattempt", name="user", field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name="quiz_attempts", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="flashcardreviewsession", name="user", field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name="flashcard_sessions", to=settings.AUTH_USER_MODEL)),
        migrations.RunPython(assign_existing_progress, migrations.RunPython.noop),
        migrations.AlterField(model_name="quizattempt", name="user", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="quiz_attempts", to=settings.AUTH_USER_MODEL)),
        migrations.AlterField(model_name="flashcardreviewsession", name="user", field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="flashcard_sessions", to=settings.AUTH_USER_MODEL)),
    ]
