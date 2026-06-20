from rest_framework.views import APIView
from common.auth import get_request_user
from common.response import error_response, success_response
from .models import BuyerProfile, PointLog
from .serializers import BuyerProfileSerializer, PointLogSerializer


class BuyerProfileView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        profile, _ = BuyerProfile.objects.get_or_create(
            buyer=user,
            defaults={'points': 0, 'total_earned': 0, 'deductible_points': 0, 'level': 'L1'}
        )
        return success_response(BuyerProfileSerializer(profile).data)


class PointLogListView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        logs = PointLog.objects.filter(buyer=user)[:50]
        return success_response(PointLogSerializer(logs, many=True).data)
