from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import StudyMaterial


@receiver(post_delete, sender=StudyMaterial)
def delete_material_file(sender, instance, **kwargs):
    if instance.file:
        storage = instance.file.storage
        name = instance.file.name
        transaction.on_commit(lambda: storage.delete(name))
