from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(name="Subject", fields=[
        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
        ("name", models.CharField(max_length=120)),
        ("color", models.CharField(default="#ef8354", max_length=20)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="subjects", to=settings.AUTH_USER_MODEL)),
    ], options={"ordering": ["name"], "constraints": [models.UniqueConstraint(fields=("owner", "name"), name="unique_subject_per_user")]})]
