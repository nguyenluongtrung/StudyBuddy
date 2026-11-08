from django.apps import AppConfig


class StudySetsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.study_sets"

    def ready(self):
        from . import signals  # noqa: F401
