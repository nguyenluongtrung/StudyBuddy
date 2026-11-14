from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("study_sets", "0004_share_codes"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="QuizChallenge",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("questions", models.JSONField()),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("challenger", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                                  related_name="sent_quiz_challenges", to=settings.AUTH_USER_MODEL)),
                ("opponent", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                                related_name="received_quiz_challenges", to=settings.AUTH_USER_MODEL)),
                ("study_set", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                                 related_name="challenges", to="study_sets.studyset")),
                ("challenger_attempt", models.OneToOneField(blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL, related_name="challenge_as_challenger",
                    to="study_sets.quizattempt")),
                ("opponent_attempt", models.OneToOneField(blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL, related_name="challenge_as_opponent",
                    to="study_sets.quizattempt")),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
    ]
