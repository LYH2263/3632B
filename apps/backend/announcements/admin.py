from django.contrib import admin
from .models import Announcement


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'is_pinned', 'valid_from', 'valid_to', 'created_at')
    search_fields = ('title', 'content')
    list_filter = ('is_pinned',)
    ordering = ['-is_pinned', '-created_at']
    fieldsets = (
        (None, {
            'fields': ('title', 'content')
        }),
        ('发布设置', {
            'fields': ('valid_from', 'valid_to', 'is_pinned')
        }),
    )
