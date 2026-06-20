from django.utils import timezone
from rest_framework.views import APIView

from common.response import success_response
from .models import Announcement
from .serializers import AnnouncementSerializer


class AnnouncementListView(APIView):
    def get(self, request):
        now = timezone.now()
        queryset = Announcement.objects.filter(
            valid_from__lte=now,
            valid_to__gte=now
        ).order_by('-is_pinned', '-created_at')
        serializer = AnnouncementSerializer(queryset, many=True)
        return success_response(serializer.data)


class AnnouncementDetailView(APIView):
    def get(self, request, announcement_id: int):
        now = timezone.now()
        announcement = Announcement.objects.filter(
            id=announcement_id,
            valid_from__lte=now,
            valid_to__gte=now
        ).first()
        if announcement is None:
            return success_response(None)
        serializer = AnnouncementSerializer(announcement)
        return success_response(serializer.data)
