from django.core.cache import cache
from django.core.paginator import Paginator
from django.db import transaction
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from merchants.models import Merchant
from .models import Product, StockLedger
from .serializers import ProductSerializer, StockLedgerSerializer


def require_merchant_permission(request, merchant_id: int):
    user = get_request_user(request)
    if user is None:
        return error_response('请先登录', status_code=403)
    if user.role != 'merchant':
        return error_response('仅商家可操作', status_code=403)
    if user.merchant_id != merchant_id:
        return error_response('无权操作该商家数据', status_code=403)
    return None


def build_product_cache_key(merchant_id: str, keyword: str) -> str:
    merchant_part = merchant_id or 'all'
    keyword_part = keyword or '_'
    return f'product:list:{merchant_part}:{keyword_part}'


class ProductListView(APIView):
    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        keyword = request.query_params.get('keyword', '').strip()
        cache_key = build_product_cache_key(str(merchant_id or ''), keyword)

        cached = cache.get(cache_key)
        if cached is not None:
            return success_response(cached)

        queryset = Product.objects.all().order_by('id')
        if merchant_id:
            queryset = queryset.filter(merchant_id=merchant_id)
        if keyword:
            queryset = queryset.filter(name__icontains=keyword)

        serializer = ProductSerializer(queryset, many=True)
        cache.set(cache_key, serializer.data, 60)
        return success_response(serializer.data)

    def post(self, request):
        payload = request.data.copy()
        merchant_id = payload.get('merchant_id')
        if merchant_id is None:
            return error_response('merchant_id 必填', status_code=400)

        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        permission_error = require_merchant_permission(request, merchant.id)
        if permission_error is not None:
            return permission_error

        payload['merchant'] = merchant.id
        serializer = ProductSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        cache.clear()

        return success_response(serializer.data, status_code=201)


class ProductDetailView(APIView):
    def get(self, request, product_id: int):
        product = Product.objects.filter(id=product_id).first()
        if product is None:
            return success_response(None)
        serializer = ProductSerializer(product)
        return success_response(serializer.data)

    @transaction.atomic
    def patch(self, request, product_id: int):
        product = Product.objects.select_for_update().filter(id=product_id).first()
        if product is None:
            return error_response('商品不存在', status_code=404)

        payload = request.data.copy()
        target_merchant_id = product.merchant_id
        if 'merchant_id' in payload:
            merchant = Merchant.objects.filter(id=payload.get('merchant_id')).first()
            if merchant is None:
                return error_response('商家不存在', status_code=404)
            if merchant.id != product.merchant_id:
                return error_response('不允许变更所属商家', status_code=400)
            payload['merchant'] = merchant.id
            target_merchant_id = merchant.id

        permission_error = require_merchant_permission(request, target_merchant_id)
        if permission_error is not None:
            return permission_error

        current_user = get_request_user(request)
        stock_changed = False
        new_stock = None
        if 'stock' in payload:
            try:
                new_stock = int(payload['stock'])
            except (TypeError, ValueError):
                return error_response('stock 必须是整数', status_code=400)
            if new_stock < -1:
                return error_response('stock 不能小于 -1', status_code=400)
            if product.stock != new_stock:
                stock_changed = True
            del payload['stock']

        serializer = ProductSerializer(product, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if stock_changed:
            if product.stock == -1 and new_stock == -1:
                pass
            elif product.stock == -1:
                change_quantity = new_stock
                product.adjust_stock(
                    change_quantity=change_quantity,
                    reason='merchant_adjust',
                    operator=current_user
                )
            elif new_stock == -1:
                pass
            else:
                change_quantity = new_stock - product.stock
                if change_quantity != 0:
                    product.adjust_stock(
                        change_quantity=change_quantity,
                        reason='merchant_adjust',
                        operator=current_user
                    )

        cache.clear()
        return success_response(ProductSerializer(product).data)


class StockLedgerListView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'merchant':
            return error_response('仅商家可查看库存流水', status_code=403)

        product_id = request.query_params.get('product_id')
        if not product_id:
            return error_response('product_id 必填', status_code=400)
        try:
            product_id = int(product_id)
        except (TypeError, ValueError):
            return error_response('product_id 非法', status_code=400)

        product = Product.objects.filter(id=product_id).first()
        if product is None:
            return error_response('商品不存在', status_code=404)
        if product.merchant_id != user.merchant_id:
            return error_response('无权查看该商品库存流水', status_code=403)

        reason = request.query_params.get('reason')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        if page_size > 100:
            page_size = 100

        queryset = StockLedger.objects.filter(product_id=product_id).select_related('operator', 'order')
        if reason:
            queryset = queryset.filter(reason=reason)

        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)
        serializer = StockLedgerSerializer(page_obj.object_list, many=True)

        return success_response({
            'list': serializer.data,
            'total': paginator.count,
            'page': page,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
        })
