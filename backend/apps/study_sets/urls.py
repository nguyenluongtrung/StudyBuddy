from rest_framework.routers import DefaultRouter

from .views import StudySetViewSet

router = DefaultRouter()
router.register("", StudySetViewSet, basename="study-set")
urlpatterns = router.urls
