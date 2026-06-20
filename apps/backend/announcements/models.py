from django.db import models


class Announcement(models.Model):
    title = models.CharField(max_length=120)
    content = models.TextField()
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'announcement'
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return self.title
