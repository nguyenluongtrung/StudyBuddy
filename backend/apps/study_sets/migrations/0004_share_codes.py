import secrets

from django.db import migrations, models


SHARE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def replace_invite_tokens(apps, schema_editor):
    StudySet = apps.get_model("study_sets", "StudySet")
    for study_set in StudySet.objects.exclude(share_token__isnull=True).iterator():
        while True:
            code = "".join(secrets.choice(SHARE_ALPHABET) for _ in range(12))
            if not StudySet.objects.filter(share_code=code).exists():
                study_set.share_code = code
                study_set.save(update_fields=["share_code"])
                break


class Migration(migrations.Migration):
    dependencies = [("study_sets", "0003_study_set_sharing")]

    operations = [
        migrations.AddField(
            model_name="studyset", name="share_code",
            field=models.CharField(blank=True, default=None, max_length=12, null=True, unique=True),
        ),
        migrations.RunPython(replace_invite_tokens, migrations.RunPython.noop),
        migrations.RemoveField(model_name="studyset", name="share_token"),
    ]
