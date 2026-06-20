from rest_framework import serializers

from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = [
            'id',
            'title',
            'content',
            'valid_from',
            'valid_to',
            'is_pinned',
            'created_at'
        ]
