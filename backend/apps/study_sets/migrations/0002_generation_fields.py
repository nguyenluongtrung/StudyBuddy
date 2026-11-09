from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("study_sets", "0001_initial")]

    operations = [
        migrations.AddField(model_name="studyset", name="generate_flashcards", field=models.BooleanField(default=True)),
        migrations.AddField(model_name="studyset", name="generate_quiz", field=models.BooleanField(default=True)),
        migrations.AddField(model_name="studyset", name="generation_status", field=models.CharField(choices=[("pending", "Pending"), ("ready", "Ready"), ("failed", "Failed"), ("outdated", "Outdated")], default="pending", max_length=8)),
        migrations.AddField(model_name="studyset", name="generation_error", field=models.CharField(blank=True, max_length=255)),
    ]
