from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("study_sets", "0006_flashcard_schedule"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ExamPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=120)),
                ("exam_date", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="exam_plans", to=settings.AUTH_USER_MODEL)),
                ("study_sets", models.ManyToManyField(related_name="exam_plans", to="study_sets.studyset")),
            ],
            options={"ordering": ["exam_date", "id"]},
        ),
    ]
