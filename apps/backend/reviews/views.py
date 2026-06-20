from django.db import transaction
from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from merchants.views import require_merchant_permission
from orders.models import Order
from products.models import Product
from .models import ProductReview
from .serializers import (
    CreateReviewSerializer,
    ProductReviewSerializer,
    ReplyReviewSerializer
)


class ReviewCreateView(APIView):
    @transaction.atomic
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可评价', status_code=403)

        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order = Order.objects.select_for_update().filter(id=data['order_id']).first()
        if order is None:
            return error_response('订单不存在', status_code=404)

        if order.buyer_id != user.id:
            return error_response('无权评价该订单', status_code=403)

        if order.status != 'completed':
            return error_response('仅已完成订单可评价', status_code=400)

        product = Product.objects.filter(id=data['product_id']).first()
        if product is None:
            return error_response('商品不存在', status_code=404)

        order_product_ids = [item['product_id'] for item in order.items_snapshot]
        if data['product_id'] not in order_product_ids:
            return error_response('该商品不在订单中', status_code=400)

        existing = ProductReview.objects.filter(
            order_id=data['order_id'],
            product_id=data['product_id']
        ).first()
        if existing is not None:
            return error_response('该商品已评价，不可重复评价', status_code=400)

        review = ProductReview.objects.create(
            order=order,
            product=product,
            buyer=user,
            merchant=product.merchant,
            rating=data['rating'],
            content=data['content'].strip()
        )

        return success_response(
            ProductReviewSerializer(review).data,
            status_code=201
        )


class ReviewListView(APIView):
    def get(self, request):
        product_id_str = request.query_params.get('product_id')
        merchant_id_str = request.query_params.get('merchant_id')

        if product_id_str:
            try:
                product_id = int(product_id_str)
            except (TypeError, ValueError):
                return error_response('product_id 非法', status_code=400)

            reviews = ProductReview.objects.filter(
                product_id=product_id
            ).select_related(
                'product',
                'buyer',
                'order'
            ).order_by('-created_at')

            serializer = ProductReviewSerializer(reviews, many=True)

            stats = ProductReview.objects.filter(product_id=product_id).aggregate(
                total=Count('id'),
                avg_rating=Avg('rating'),
                five=Count('id', filter=Q(rating=5)),
                four=Count('id', filter=Q(rating=4)),
                three=Count('id', filter=Q(rating=3)),
                two=Count('id', filter=Q(rating=2)),
                one=Count('id', filter=Q(rating=1))
            )

            total = stats['total'] or 0
            avg_raw = stats['avg_rating'] or 0
            average_rating = round(float(avg_raw), 1) if total > 0 else 0

            summary = {
                'product_id': product_id,
                'average_rating': average_rating,
                'review_count': total,
                'five_star_count': stats['five'] or 0,
                'four_star_count': stats['four'] or 0,
                'three_star_count': stats['three'] or 0,
                'two_star_count': stats['two'] or 0,
                'one_star_count': stats['one'] or 0
            }

            return success_response({
                'reviews': serializer.data,
                'summary': summary
            })

        if merchant_id_str:
            try:
                merchant_id = int(merchant_id_str)
            except (TypeError, ValueError):
                return error_response('merchant_id 非法', status_code=400)

            permission_error = require_merchant_permission(request, merchant_id)
            if permission_error is not None:
                return permission_error

            reviews = ProductReview.objects.filter(
                merchant_id=merchant_id
            ).select_related(
                'product',
                'buyer',
                'order'
            ).order_by('-created_at')

            serializer = ProductReviewSerializer(reviews, many=True)
            return success_response(serializer.data)

        return error_response('product_id 或 merchant_id 必填', status_code=400)


class ReviewReplyView(APIView):
    @transaction.atomic
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'merchant':
            return error_response('仅商家可回复评价', status_code=403)

        serializer = ReplyReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        review = ProductReview.objects.select_for_update().filter(
            id=data['review_id']
        ).first()
        if review is None:
            return error_response('评价不存在', status_code=404)

        if review.merchant_id != user.merchant_id:
            return error_response('无权回复该评价', status_code=403)

        if review.reply and review.reply.strip():
            return error_response('已回复过，不可重复回复', status_code=400)

        review.reply = data['reply'].strip()
        review.reply_at = timezone.now()
        review.save(update_fields=['reply', 'reply_at'])

        return success_response(ProductReviewSerializer(review).data)


class PendingReviewsView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可查看', status_code=403)

        order_id_str = request.query_params.get('order_id')
        if not order_id_str:
            return error_response('order_id 必填', status_code=400)

        try:
            order_id = int(order_id_str)
        except (TypeError, ValueError):
            return error_response('order_id 非法', status_code=400)

        order = Order.objects.filter(id=order_id).first()
        if order is None:
            return error_response('订单不存在', status_code=404)

        if order.buyer_id != user.id:
            return error_response('无权查看该订单', status_code=403)

        if order.status != 'completed':
            return error_response('仅已完成订单可评价', status_code=400)

        reviewed_product_ids = set(
            ProductReview.objects.filter(order_id=order_id).values_list(
                'product_id', flat=True
            )
        )

        product_ids_in_order = [
            item['product_id'] for item in order.items_snapshot
            if item['product_id'] not in reviewed_product_ids
        ]

        products = Product.objects.filter(
            id__in=product_ids_in_order
        ).values('id', 'name', 'image_url', 'unit', 'price')

        product_map = {p['id']: p for p in products}

        pending = []
        for item in order.items_snapshot:
            pid = item['product_id']
            if pid in reviewed_product_ids:
                continue
            prod = product_map.get(pid, {})
            pending.append({
                'product_id': pid,
                'name': prod.get('name', item.get('name', '')),
                'image_url': prod.get('image_url', ''),
                'unit': prod.get('unit', item.get('unit', '')),
                'price': float(prod.get('price', item.get('price', 0))),
                'quantity': item.get('quantity', 1)
            })

        return success_response(pending)
