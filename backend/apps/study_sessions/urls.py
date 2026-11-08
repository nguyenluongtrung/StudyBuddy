from rest_framework.routers import DefaultRouter

from .views import StudySessionViewSet

router = DefaultRouter()
router.register("", StudySessionViewSet, basename="study-session")
urlpatterns = router.urls
