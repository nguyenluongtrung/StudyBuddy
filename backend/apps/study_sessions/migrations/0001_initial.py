from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [("subjects", "0001_initial"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(name="StudySession", fields=[
        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
        ("duration_minutes", models.PositiveIntegerField()),
        ("notes", models.TextField(blank=True)),
        ("started_at", models.DateTimeField()),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="study_sessions", to=settings.AUTH_USER_MODEL)),
        ("subject", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sessions", to="subjects.subject")),
    ], options={"ordering": ["-started_at"]})]
