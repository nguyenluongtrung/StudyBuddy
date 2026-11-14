from rest_framework.routers import DefaultRouter

from .exam_plans import ExamPlanViewSet

router = DefaultRouter()
router.register("", ExamPlanViewSet, basename="exam-plan")
urlpatterns = router.urls
