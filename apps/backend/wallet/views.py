from decimal import Decimal
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from users.models import StoreUser
from .models import InsufficientBalanceError, Wallet, WalletTransaction
from .serializers import TopupSerializer, WalletSerializer, WalletTransactionSerializer


class WalletDetailView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可查看钱包', status_code=403)

        wallet = Wallet.get_or_create_for_user(user.id)
        return success_response(WalletSerializer(wallet).data)


class WalletTransactionListView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可查看流水', status_code=403)

        wallet = Wallet.get_or_create_for_user(user.id)
        txns = WalletTransaction.objects.filter(wallet=wallet)
        serializer = WalletTransactionSerializer(txns, many=True)
        return success_response(serializer.data)


class TopupView(APIView):
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'merchant' and user.role != 'admin':
            return error_response('仅管理员或商家可为用户充值', status_code=403)

        serializer = TopupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user = StoreUser.objects.filter(id=serializer.validated_data['user_id']).first()
        if target_user is None:
            return error_response('目标用户不存在', status_code=404)
        if target_user.role != 'buyer':
            return error_response('仅买家钱包可充值', status_code=400)

        Wallet.get_or_create_for_user(target_user.id)

        try:
            txn = Wallet.topup(
                user_id=target_user.id,
                amount=serializer.validated_data['amount'],
                operator_id=user.id,
                remark=serializer.validated_data.get('remark', '')
            )
        except Exception as e:
            return error_response(str(e), status_code=400)

        return success_response(WalletTransactionSerializer(txn).data, status_code=201)
