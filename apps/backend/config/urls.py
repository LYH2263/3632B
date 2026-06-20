from django.contrib import admin
from django.urls import path

from users.views import LoginView, RegisterMerchantView
from merchants.views import MerchantListView, MerchantDetailView
from products.views import ProductListView, ProductDetailView
from orders.views import CartValidateView, OrderDetailView, OrderListView, OrderStatusUpdateView
from coupons.views import (
    AvailableCouponsView,
    CouponClaimView,
    CouponRedeemRecordListView,
    CouponTemplateListView,
    CouponValidateView,
    UserCouponListView
)
from reviews.views import (
    PendingReviewsView,
    ReviewCreateView,
    ReviewListView,
    ReviewReplyView
)
from aftersales.views import AfterSaleCreateView, AfterSaleListView, AfterSaleReviewView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/login', LoginView.as_view(), name='auth-login'),
    path('api/v1/auth/register-merchant', RegisterMerchantView.as_view(), name='auth-register-merchant'),
    path('api/v1/merchants', MerchantListView.as_view(), name='merchant-list'),
    path('api/v1/merchants/<int:merchant_id>', MerchantDetailView.as_view(), name='merchant-detail'),
    path('api/v1/products', ProductListView.as_view(), name='product-list'),
    path('api/v1/products/<int:product_id>', ProductDetailView.as_view(), name='product-detail'),
    path('api/v1/cart/validate', CartValidateView.as_view(), name='cart-validate'),
    path('api/v1/orders', OrderListView.as_view(), name='order-list'),
    path('api/v1/orders/<int:order_id>', OrderDetailView.as_view(), name='order-detail'),
    path('api/v1/orders/<int:order_id>/status', OrderStatusUpdateView.as_view(), name='order-status'),
    path('api/v1/coupon/templates', CouponTemplateListView.as_view(), name='coupon-template-list'),
    path('api/v1/coupon/claim', CouponClaimView.as_view(), name='coupon-claim'),
    path('api/v1/coupon/my', UserCouponListView.as_view(), name='user-coupon-list'),
    path('api/v1/coupon/validate', CouponValidateView.as_view(), name='coupon-validate'),
    path('api/v1/coupon/available', AvailableCouponsView.as_view(), name='coupon-available'),
    path('api/v1/coupon/redeem-records', CouponRedeemRecordListView.as_view(), name='coupon-redeem-records'),
    path('api/v1/reviews', ReviewListView.as_view(), name='review-list'),
    path('api/v1/reviews/create', ReviewCreateView.as_view(), name='review-create'),
    path('api/v1/reviews/reply', ReviewReplyView.as_view(), name='review-reply'),
    path('api/v1/reviews/pending', PendingReviewsView.as_view(), name='review-pending'),
    path('api/v1/aftersales', AfterSaleListView.as_view(), name='aftersale-list'),
    path('api/v1/aftersales/create', AfterSaleCreateView.as_view(), name='aftersale-create'),
    path('api/v1/aftersales/<int:aftersale_id>/review', AfterSaleReviewView.as_view(), name='aftersale-review')
]
