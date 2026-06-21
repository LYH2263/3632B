from datetime import timedelta
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.utils import timezone

from announcements.models import Announcement
from coupons.models import CouponTemplate
from membership.models import BuyerProfile
from merchants.models import Merchant, DeliverySlot
from products.models import Product
from promotions.models import Promotion, PromotionItem
from users.models import StoreUser


class Command(BaseCommand):
    help = '初始化社区商店 MVP 示例数据'

    def handle(self, *args, **options):
        merchant_a, _ = Merchant.objects.get_or_create(
            name='鲜果超市',
            defaults={
                'phone': '020-11110001',
                'address': '幸福社区 1 号楼底商',
                'delivery_note': '2 公里内 30 分钟配送',
                'min_order_amount': 25,
                'delivery_fee': 3,
                'is_open': True,
                'supports_pickup': True,
                'pickup_fee': 0
            }
        )

        merchant_b, _ = Merchant.objects.get_or_create(
            name='便民小超',
            defaults={
                'phone': '020-22220002',
                'address': '幸福社区 3 号楼底商',
                'delivery_note': '晚 10 点前配送',
                'min_order_amount': 18,
                'delivery_fee': 2,
                'is_open': True,
                'supports_pickup': False,
                'pickup_fee': 0
            }
        )

        merchant_c, _ = Merchant.objects.get_or_create(
            name='晨光面包坊',
            defaults={
                'phone': '020-33330003',
                'address': '幸福社区 5 号楼底商',
                'delivery_note': '当日现烤，11 点前下单下午送达',
                'min_order_amount': 20,
                'delivery_fee': 4,
                'is_open': True,
                'supports_pickup': True,
                'pickup_fee': 0
            }
        )

        now = timezone.now()
        valid_from = now - timedelta(days=7)
        valid_to = now + timedelta(days=30)

        coupons = [
            {
                'name': '新人专享满30减10',
                'type': 'full_reduction',
                'threshold_amount': 30,
                'discount_amount': 10,
                'valid_from': valid_from,
                'valid_to': valid_to,
                'total_quantity': 100,
                'claimed_quantity': 0,
                'per_user_limit': 1,
                'include_delivery_fee': False,
                'description': '新用户专享，满30元减10元，不含配送费'
            },
            {
                'name': '满50减15',
                'type': 'full_reduction',
                'threshold_amount': 50,
                'discount_amount': 15,
                'valid_from': valid_from,
                'valid_to': valid_to,
                'total_quantity': 200,
                'claimed_quantity': 0,
                'per_user_limit': 2,
                'include_delivery_fee': True,
                'description': '满50元减15元，含配送费'
            },
            {
                'name': '满100减30',
                'type': 'full_reduction',
                'threshold_amount': 100,
                'discount_amount': 30,
                'valid_from': valid_from,
                'valid_to': valid_to,
                'total_quantity': 50,
                'claimed_quantity': 0,
                'per_user_limit': 1,
                'include_delivery_fee': True,
                'description': '满100元减30元，含配送费'
            }
        ]

        for coupon_data in coupons:
            CouponTemplate.objects.get_or_create(
                name=coupon_data['name'],
                defaults=coupon_data
            )

        products = [
            {
                'merchant': merchant_a,
                'name': '红富士苹果',
                'price': 6.8,
                'unit': '斤',
                'stock': 100,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/ffe4b5/333333&text=苹果',
                'description': '当日新鲜到货，清甜爽口。'
            },
            {
                'merchant': merchant_a,
                'name': '进口香蕉',
                'price': 5.2,
                'unit': '斤',
                'stock': 88,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/fff68f/333333&text=香蕉',
                'description': '口感软糯，适合家庭早餐。'
            },
            {
                'merchant': merchant_b,
                'name': '纯牛奶',
                'price': 12.9,
                'unit': '瓶',
                'stock': 50,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/e0f7ff/333333&text=牛奶',
                'description': '1L 装，冷藏保存。'
            },
            {
                'merchant': merchant_b,
                'name': '鸡蛋',
                'price': 9.8,
                'unit': '盒',
                'stock': -1,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/f5deb3/333333&text=鸡蛋',
                'description': '10 枚/盒，新鲜农场蛋。'
            },
            {
                'merchant': merchant_a,
                'name': '砂糖橘',
                'price': 8.5,
                'unit': '斤',
                'stock': 60,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/ffa500/333333&text=砂糖橘',
                'description': '皮薄多汁，当季优选。'
            },
            {
                'merchant': merchant_a,
                'name': '阳光玫瑰葡萄',
                'price': 22.8,
                'unit': '斤',
                'stock': 35,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/d4edda/333333&text=葡萄',
                'description': '脆甜无籽，适合家庭分享。'
            },
            {
                'merchant': merchant_a,
                'name': '鲜榨橙汁',
                'price': 15.0,
                'unit': '瓶',
                'stock': 40,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/ff8c00/333333&text=橙汁',
                'description': '500ml 装，无添加。'
            },
            {
                'merchant': merchant_b,
                'name': '五常大米',
                'price': 39.9,
                'unit': '袋',
                'stock': 30,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/f5f5dc/333333&text=大米',
                'description': '5kg 装，东北优质大米。'
            },
            {
                'merchant': merchant_b,
                'name': '抽纸',
                'price': 12.5,
                'unit': '提',
                'stock': 80,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/e8e8e8/333333&text=抽纸',
                'description': '3 层 120 抽 × 6 包。'
            },
            {
                'merchant': merchant_b,
                'name': '矿泉水',
                'price': 2.0,
                'unit': '瓶',
                'stock': 200,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/b0e0e6/333333&text=矿泉水',
                'description': '550ml 装，整箱更优惠。'
            },
            {
                'merchant': merchant_c,
                'name': '全麦吐司',
                'price': 12.0,
                'unit': '袋',
                'stock': 25,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/deb887/333333&text=吐司',
                'description': '当日现烤，低糖配方。'
            },
            {
                'merchant': merchant_c,
                'name': '法式可颂',
                'price': 6.5,
                'unit': '个',
                'stock': 40,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/f4a460/333333&text=可颂',
                'description': '黄油层次分明，外酥内软。'
            },
            {
                'merchant': merchant_c,
                'name': '鲜奶油蛋糕',
                'price': 68.0,
                'unit': '盒',
                'stock': 8,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/ffb6c1/333333&text=蛋糕',
                'description': '6 寸生日蛋糕，需提前 1 天预订。'
            },
            {
                'merchant': merchant_c,
                'name': '牛肉三明治',
                'price': 15.0,
                'unit': '个',
                'stock': 20,
                'is_active': True,
                'image_url': 'https://dummyimage.com/240x240/d2b48c/333333&text=三明治',
                'description': '现做现卖，适合早餐或午餐。'
            }
        ]

        for item in products:
            Product.objects.get_or_create(
                merchant=item['merchant'],
                name=item['name'],
                defaults={
                    'price': item['price'],
                    'unit': item['unit'],
                    'stock': item['stock'],
                    'is_active': item['is_active'],
                    'image_url': item['image_url'],
                    'description': item['description']
                }
            )

        StoreUser.objects.get_or_create(
            username='merchant_fruit',
            defaults={
                'password': make_password('merchant123'),
                'role': 'merchant',
                'nickname': '鲜果超市店主',
                'phone': '13900001111',
                'merchant': merchant_a
            }
        )

        StoreUser.objects.get_or_create(
            username='merchant_market',
            defaults={
                'password': make_password('merchant123'),
                'role': 'merchant',
                'nickname': '便民小超店主',
                'phone': '13900002222',
                'merchant': merchant_b
            }
        )

        StoreUser.objects.get_or_create(
            username='merchant_bakery',
            defaults={
                'password': make_password('merchant123'),
                'role': 'merchant',
                'nickname': '晨光面包坊店主',
                'phone': '13900003333',
                'merchant': merchant_c
            }
        )

        buyer, _ = StoreUser.objects.get_or_create(
            username='buyer',
            defaults={
                'password': make_password('buyer123'),
                'role': 'buyer',
                'nickname': '社区住户',
                'phone': '13800138000'
            }
        )

        BuyerProfile.objects.get_or_create(
            buyer=buyer,
            defaults={
                'points': 120,
                'total_earned': 120,
                'deductible_points': 120,
                'level': 'L2'
            }
        )

        announcements = [
            {
                'title': '社区停水通知',
                'content': '各位居民：\n因市政管道维修，本社区将于明日（6月21日）上午9:00-12:00暂停供水，请提前做好储水准备。\n\n如有疑问请联系物业：020-12345678',
                'valid_from': now - timedelta(days=1),
                'valid_to': now + timedelta(days=2),
                'is_pinned': True
            },
            {
                'title': '端午节促销活动',
                'content': '端午佳节来临之际，社区商店全场满100减20！\n\n活动时间：6月22日-6月24日\n参与商家：鲜果超市、便民小超\n\n欢迎大家前来选购！',
                'valid_from': now - timedelta(days=1),
                'valid_to': now + timedelta(days=7),
                'is_pinned': False
            },
            {
                'title': '快递驿站营业时间调整',
                'content': '自7月1日起，社区快递驿站营业时间调整为：\n工作日：8:00-20:00\n周末：9:00-18:00\n\n请合理安排取件时间。',
                'valid_from': now + timedelta(days=3),
                'valid_to': now + timedelta(days=30),
                'is_pinned': False
            }
        ]

        for item in announcements:
            Announcement.objects.get_or_create(
                title=item['title'],
                defaults=item
            )

        now = timezone.now()
        promotion_start = now - timedelta(days=1)
        promotion_end = now + timedelta(days=6)

        promotion, created = Promotion.objects.get_or_create(
            name='限时特惠-鲜果尝鲜',
            merchant=merchant_a,
            defaults={
                'description': '新鲜水果限时特价，红富士苹果4.8元/斤，进口香蕉3.8元/斤，限时一周！',
                'start_at': promotion_start,
                'end_at': promotion_end,
                'status': 'active'
            }
        )

        if created:
            apple = Product.objects.get(merchant=merchant_a, name='红富士苹果')
            banana = Product.objects.get(merchant=merchant_a, name='进口香蕉')

            PromotionItem.objects.get_or_create(
                promotion=promotion,
                product=apple,
                defaults={
                    'promo_price': 4.8,
                    'promo_stock': 50,
                    'sold_quantity': 0
                }
            )

            PromotionItem.objects.get_or_create(
                promotion=promotion,
                product=banana,
                defaults={
                    'promo_price': 3.8,
                    'promo_stock': -1,
                    'sold_quantity': 0
                }
            )

        promotion_b, created_b = Promotion.objects.get_or_create(
            name='乳品特惠-周末狂欢',
            merchant=merchant_b,
            defaults={
                'description': '纯牛奶 10.9 元/瓶，限时三天！',
                'start_at': promotion_start,
                'end_at': promotion_end,
                'status': 'active'
            }
        )

        if created_b:
            milk = Product.objects.get(merchant=merchant_b, name='纯牛奶')
            PromotionItem.objects.get_or_create(
                promotion=promotion_b,
                product=milk,
                defaults={
                    'promo_price': 10.9,
                    'promo_stock': 30,
                    'sold_quantity': 5
                }
            )

        promotion_c, created_c = Promotion.objects.get_or_create(
            name='烘焙新品-第二件半价',
            merchant=merchant_c,
            defaults={
                'description': '法式可颂、牛肉三明治参与第二件半价活动。',
                'start_at': promotion_start,
                'end_at': promotion_end,
                'status': 'active'
            }
        )

        if created_c:
            croissant = Product.objects.get(merchant=merchant_c, name='法式可颂')
            sandwich = Product.objects.get(merchant=merchant_c, name='牛肉三明治')

            PromotionItem.objects.get_or_create(
                promotion=promotion_c,
                product=croissant,
                defaults={
                    'promo_price': 4.9,
                    'promo_stock': -1,
                    'sold_quantity': 12
                }
            )

            PromotionItem.objects.get_or_create(
                promotion=promotion_c,
                product=sandwich,
                defaults={
                    'promo_price': 12.0,
                    'promo_stock': 15,
                    'sold_quantity': 3
                }
            )

        delivery_slots_merchant_a = [
            {'start_time': '09:00', 'end_time': '11:00', 'capacity': 10},
            {'start_time': '11:00', 'end_time': '13:00', 'capacity': 8},
            {'start_time': '14:00', 'end_time': '16:00', 'capacity': 12},
            {'start_time': '16:00', 'end_time': '18:00', 'capacity': 15},
            {'start_time': '18:00', 'end_time': '20:00', 'capacity': 10},
        ]

        for slot_data in delivery_slots_merchant_a:
            DeliverySlot.objects.get_or_create(
                merchant=merchant_a,
                start_time=slot_data['start_time'],
                end_time=slot_data['end_time'],
                defaults={
                    'capacity': slot_data['capacity'],
                    'is_active': True
                }
            )

        delivery_slots_merchant_b = [
            {'start_time': '10:00', 'end_time': '12:00', 'capacity': 6},
            {'start_time': '15:00', 'end_time': '17:00', 'capacity': 6},
            {'start_time': '17:00', 'end_time': '19:00', 'capacity': 8},
        ]

        for slot_data in delivery_slots_merchant_b:
            DeliverySlot.objects.get_or_create(
                merchant=merchant_b,
                start_time=slot_data['start_time'],
                end_time=slot_data['end_time'],
                defaults={
                    'capacity': slot_data['capacity'],
                    'is_active': True
                }
            )

        delivery_slots_merchant_c = [
            {'start_time': '08:00', 'end_time': '10:00', 'capacity': 5},
            {'start_time': '11:00', 'end_time': '13:00', 'capacity': 8},
            {'start_time': '15:00', 'end_time': '17:00', 'capacity': 6},
        ]

        for slot_data in delivery_slots_merchant_c:
            DeliverySlot.objects.get_or_create(
                merchant=merchant_c,
                start_time=slot_data['start_time'],
                end_time=slot_data['end_time'],
                defaults={
                    'capacity': slot_data['capacity'],
                    'is_active': True
                }
            )

        self.stdout.write(self.style.SUCCESS('MVP 示例数据初始化完成'))
