<template>
  <template v-if="authUser && merchant">
    <!-- 顶部导航栏 -->
    <div class="dashboard-navbar" data-testid="web-dashboard-header">
      <div class="navbar-left">
        <div class="navbar-store-icon">🏪</div>
        <span class="navbar-store-name">{{ merchant.name }}</span>
        <span class="navbar-status-badge" :class="merchantForm.is_open ? 'open' : 'closed'">
          <span class="navbar-status-dot"></span>
          {{ merchantForm.is_open ? '营业中' : '休息中' }}
        </span>
      </div>
      <el-button text type="danger" @click="logout">退出登录</el-button>
    </div>

    <div class="dashboard-page" data-testid="web-dashboard-page">
      <!-- 区块导航 -->
      <div class="section-nav">
        <button
          v-for="sec in sections" :key="sec.key"
          class="section-nav-btn" :class="{ active: activeSection === sec.key }"
          @click="scrollToSection(sec.key)"
        >{{ sec.label }}</button>
      </div>

    <el-card class="block" ref="merchantSection" data-testid="web-merchant-card">
      <template #header>
        <div class="block-title" data-testid="web-merchant-card-title">店铺信息维护</div>
      </template>
      <el-form label-width="120px" :model="merchantForm" data-testid="web-merchant-form">
        <el-form-item label="店铺名称">
          <el-input :model-value="merchant.name" data-testid="web-merchant-name" disabled />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="merchantForm.phone" data-testid="web-merchant-phone" />
        </el-form-item>
        <el-form-item label="店铺地址">
          <el-input v-model="merchantForm.address" data-testid="web-merchant-address" />
        </el-form-item>
        <el-form-item label="配送说明">
          <el-input v-model="merchantForm.delivery_note" data-testid="web-merchant-delivery-note" />
        </el-form-item>
        <el-form-item label="起送价">
          <el-input-number v-model="merchantForm.min_order_amount" data-testid="web-merchant-min-order" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="配送费">
          <el-input-number v-model="merchantForm.delivery_fee" data-testid="web-merchant-delivery-fee" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="到店自提">
          <el-switch
            v-model="merchantForm.supports_pickup"
            data-testid="web-merchant-supports-pickup"
            active-text="支持"
            inactive-text="不支持"
          />
        </el-form-item>
        <el-form-item label="自提费">
          <el-input-number v-model="merchantForm.pickup_fee" data-testid="web-merchant-pickup-fee" :min="0" :step="1" :disabled="!merchantForm.supports_pickup" />
        </el-form-item>
        <el-form-item label="营业状态">
          <el-switch
            v-model="merchantForm.is_open"
            data-testid="web-merchant-is-open"
            active-text="营业中"
            inactive-text="休息中"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" data-testid="web-merchant-save" @click="saveMerchant">保存店铺信息</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="block" ref="productSection" data-testid="web-product-card">
      <template #header>
        <div class="block-header">
          <div class="block-title" data-testid="web-product-card-title">商品管理</div>
          <el-button type="primary" data-testid="web-product-open-create" @click="openCreateDialog">新增商品</el-button>
        </div>
      </template>

      <div class="table-wrapper">
      <el-table :data="products" stripe data-testid="web-product-table">
        <el-table-column prop="name" label="商品" />
        <el-table-column label="价格">
          <template #default="scope">{{ formatMoney(scope.row.price) }}/{{ scope.row.unit }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="scope">{{ scope.row.is_active ? '上架' : '下架' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260">
          <template #default="scope">
            <el-space>
              <el-button size="small" :data-testid="`web-product-edit-${scope.row.id}`" @click="openEditDialog(scope.row)">
                编辑
              </el-button>
              <el-button
                size="small"
                type="warning"
                :data-testid="`web-product-toggle-${scope.row.id}`"
                @click="toggleProduct(scope.row)"
              >
                {{ scope.row.is_active ? '下架' : '上架' }}
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
      </div>
    </el-card>

    <el-card class="block" ref="orderSection" data-testid="web-order-card">
      <template #header>
        <div class="block-title" data-testid="web-order-card-title">订单管理</div>
      </template>
      <div class="table-wrapper">
      <el-table :data="orders" stripe data-testid="web-order-table">
        <el-table-column prop="order_no" label="订单号" min-width="220" />
        <el-table-column label="金额" width="120">
          <template #default="scope">{{ formatMoney(scope.row.total_amount) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">{{ statusLabel(scope.row.status, scope.row.fulfillment_type) }}</template>
        </el-table-column>
        <el-table-column label="履约方式" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.fulfillment_type === 'pickup' ? 'warning' : 'primary'" size="small">
              {{ fulfillmentTypeLabel(scope.row.fulfillment_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="联系信息" min-width="180">
          <template #default="scope">{{ scope.row.receiver_name }} / {{ scope.row.receiver_phone }}</template>
        </el-table-column>
        <el-table-column label="订单详情" width="120">
          <template #default="scope">
            <el-button
              size="small"
              :data-testid="`web-order-detail-${scope.row.id}`"
              @click="openOrderDetail(scope.row)"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="状态推进" min-width="260">
          <template #default="scope">
            <el-space wrap>
              <el-button
                v-for="next in nextStatuses(scope.row.status, scope.row.fulfillment_type)"
                :key="`${scope.row.id}-${next}`"
                size="small"
                type="primary"
                :data-testid="`web-order-status-${scope.row.id}-${next}`"
                @click="updateOrderStatus(scope.row.id, next)"
              >
                {{ statusLabel(next, scope.row.fulfillment_type) }}
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
      </div>
    </el-card>

    <el-card class="block" ref="couponSection" data-testid="web-coupon-card">
      <template #header>
        <div class="block-title" data-testid="web-coupon-card-title">优惠券核销记录</div>
      </template>

      <div class="table-wrapper">
      <el-table :data="couponRedeemRecords" stripe data-testid="web-coupon-table">
        <el-table-column prop="template_name" label="优惠券名称" min-width="160" />
        <el-table-column prop="order_no" label="关联订单号" min-width="200" />
        <el-table-column prop="buyer_nickname" label="买家" width="120" />
        <el-table-column label="商品金额" width="120">
          <template #default="scope">¥{{ Number(scope.row.items_amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="抵扣金额" width="120">
          <template #default="scope">
            <span style="color: #f56c6c; font-weight: 600;">-¥{{ Number(scope.row.discount_amount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="redeemed_at" label="核销时间" min-width="180">
          <template #default="scope">
            {{ new Date(scope.row.redeemed_at).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
      </el-table>
      </div>

      <div v-if="!couponRedeemRecords.length" style="text-align: center; padding: 30px 0; color: #909399;">
        暂无核销记录
      </div>
    </el-card>

    <el-card class="block" ref="reviewSection" data-testid="web-review-card">
      <template #header>
        <div class="block-title" data-testid="web-review-card-title">评价管理</div>
      </template>

      <div class="table-wrapper">
      <el-table :data="reviews" stripe data-testid="web-review-table">
        <el-table-column label="商品" min-width="160">
          <template #default="scope">
            <div>
              <div>{{ scope.row.product_name || `商品 #${scope.row.product_id}` }}</div>
              <div style="color: #909399; font-size: 12px;">订单号：{{ scope.row.order_no }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="buyer_nickname" label="买家" width="120" />
        <el-table-column label="评分" width="120">
          <template #default="scope">
            <span :style="{ color: '#e6a23c', fontWeight: 600 }">
              {{ '★'.repeat(scope.row.rating) }}{{ '☆'.repeat(5 - scope.row.rating) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="评价内容" min-width="240" show-overflow-tooltip>
          <template #default="scope">
            {{ scope.row.content || '（无文字评价）' }}
          </template>
        </el-table-column>
        <el-table-column label="商家回复" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            <div v-if="scope.row.reply">
              <div>{{ scope.row.reply }}</div>
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">
                {{ formatReviewDate(scope.row.reply_at!) }}
              </div>
            </div>
            <span v-else style="color: #909399;">未回复</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="评价时间" min-width="160">
          <template #default="scope">
            {{ formatReviewDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              type="primary"
              :disabled="!!scope.row.reply"
              :data-testid="`web-review-reply-${scope.row.id}`"
              @click="openReplyDialog(scope.row.id)"
            >
              {{ scope.row.reply ? '已回复' : '回复' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <div v-if="!reviews.length" style="text-align: center; padding: 30px 0; color: #909399;">
        暂无评价
      </div>
    </el-card>

    <el-dialog
      v-model="productDialogVisible"
      :title="editingProductId ? '编辑商品' : '新增商品'"
      width="560px"
      data-testid="web-product-dialog"
    >
      <el-form :model="productForm" label-width="90px" data-testid="web-product-form">
        <el-form-item label="商品名">
          <el-input v-model="productForm.name" data-testid="web-product-name" />
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="productForm.price" data-testid="web-product-price" :min="0" :step="0.1" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="productForm.unit" data-testid="web-product-unit" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="productForm.stock" data-testid="web-product-stock" :step="1" />
        </el-form-item>
        <el-form-item label="图片">
          <el-input v-model="productForm.image_url" data-testid="web-product-image" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="productForm.description" data-testid="web-product-description" type="textarea" />
        </el-form-item>
        <el-form-item label="上架">
          <el-switch v-model="productForm.is_active" data-testid="web-product-active" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button data-testid="web-product-cancel" @click="productDialogVisible = false">取消</el-button>
        <el-button type="primary" data-testid="web-product-save" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="orderDetailVisible"
      title="订单详情（配货单/价格表）"
      width="760px"
      data-testid="web-order-detail-dialog"
    >
      <template v-if="activeOrder">
        <p data-testid="web-order-detail-order-no">订单号：{{ activeOrder.order_no }}</p>
        <p>支付方式：线下支付</p>
        <p>履约方式：{{ fulfillmentTypeLabel(activeOrder.fulfillment_type) }}</p>
        <p>联系人：{{ activeOrder.receiver_name }} / {{ activeOrder.receiver_phone }}</p>
        <p>{{ activeOrder.fulfillment_type === 'pickup' ? '自提地址' : '收货地址' }}：{{ activeOrder.receiver_address }}</p>
        <p>备注：{{ activeOrder.remark || '无' }}</p>

        <h4 style="margin: 12px 0 8px;">配货单</h4>
        <el-table :data="activeOrder.items_snapshot" border>
          <el-table-column prop="name" label="商品" />
          <el-table-column prop="quantity" label="数量" width="120" />
          <el-table-column prop="unit" label="单位" width="120" />
        </el-table>

        <h4 style="margin: 12px 0 8px;">价格表</h4>
        <el-table :data="activeOrder.items_snapshot" border>
          <el-table-column prop="name" label="商品" />
          <el-table-column label="单价" width="120">
            <template #default="scope">{{ formatMoney(scope.row.price) }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="120" />
          <el-table-column label="小计" width="120">
            <template #default="scope">{{ formatMoney(scope.row.subtotal) }}</template>
          </el-table-column>
        </el-table>

        <p style="margin-top: 12px;">商品合计：{{ formatMoney(activeOrder.items_amount) }}</p>
        <p>配送费：{{ formatMoney(activeOrder.delivery_fee) }}</p>
        <p><strong>总金额：{{ formatMoney(activeOrder.total_amount) }}</strong></p>
      </template>
    </el-dialog>

    <el-dialog
      v-model="rejectDialogVisible"
      title="拒绝售后"
      width="560px"
      data-testid="web-aftersale-reject-dialog"
    >
      <el-form label-width="100px">
        <el-form-item label="拒绝原因">
          <el-select v-model="rejectReason" placeholder="请选择拒绝原因" data-testid="web-aftersale-reject-reason">
            <el-option
              v-for="(label, key) in AFTERSALE_REJECT_REASON_LABELS"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="补充说明">
          <el-input
            v-model="rejectRemark"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="请输入补充说明（选填）"
            data-testid="web-aftersale-reject-remark"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button data-testid="web-aftersale-reject-cancel" @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" data-testid="web-aftersale-reject-submit" @click="submitReject">确认拒绝</el-button>
      </template>
    </el-dialog>

    <el-card class="block" ref="aftersaleSection" data-testid="web-aftersale-card">
      <template #header>
        <div class="block-title" data-testid="web-aftersale-card-title">售后审核</div>
      </template>

      <div class="table-wrapper">
      <el-table :data="aftersales" stripe data-testid="web-aftersale-table">
        <el-table-column prop="order_no" label="订单号" min-width="200" />
        <el-table-column label="退款原因" width="120">
          <template #default="scope">{{ aftersaleReasonLabel(scope.row.reason) }}</template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="scope">{{ aftersaleStatusLabel(scope.row.status) }}</template>
        </el-table-column>
        <el-table-column label="申请时间" min-width="160">
          <template #default="scope">{{ new Date(scope.row.created_at).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <template v-if="scope.row.status === 'pending'">
              <el-space>
                <el-button
                  size="small"
                  type="success"
                  :data-testid="`web-aftersale-approve-${scope.row.id}`"
                  @click="approveAfterSale(scope.row.id)"
                >
                  同意
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  :data-testid="`web-aftersale-reject-${scope.row.id}`"
                  @click="openRejectDialog(scope.row.id)"
                >
                  拒绝
                </el-button>
              </el-space>
            </template>
            <template v-else-if="scope.row.status === 'rejected'">
              <span style="color: #f56c6c; font-size: 12px;">
                拒绝原因：{{ aftersaleRejectReasonLabel(scope.row.reject_reason) }}
                <template v-if="scope.row.reject_remark">（{{ scope.row.reject_remark }}）</template>
              </span>
            </template>
            <template v-else>
              <span style="color: #67c23a; font-size: 12px;">已退款</span>
            </template>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <div v-if="!aftersales.length" style="text-align: center; padding: 30px 0; color: #909399;">
        暂无售后申请
      </div>
    </el-card>

    <el-dialog
      v-model="replyDialogVisible"
      title="回复评价"
      width="560px"
      data-testid="web-review-reply-dialog"
    >
      <el-form label-width="80px">
        <el-form-item label="回复内容">
          <el-input
            v-model="replyContent"
            type="textarea"
            :rows="5"
            maxlength="500"
            show-word-limit
            placeholder="请输入回复内容（500字内）"
            data-testid="web-review-reply-content"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button data-testid="web-review-reply-cancel" @click="replyDialogVisible = false">取消</el-button>
        <el-button type="primary" data-testid="web-review-reply-submit" @click="submitReply">提交回复</el-button>
      </template>
    </el-dialog>
  </div>
  </template>
  <div v-else class="dashboard-page" data-testid="web-dashboard-empty"></div>
</template>

<script setup lang="ts">
import {
  AFTERSALE_REASON_LABELS,
  AFTERSALE_REJECT_REASON_LABELS,
  AFTERSALE_STATUS_LABELS,
  FULFILLMENT_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  STATUS_TRANSITIONS,
  type AfterSale,
  type CouponRedeemRecord,
  type FulfillmentType,
  type Merchant,
  type Order,
  type OrderStatus,
  type Product,
  type ProductReview,
  type User
} from '@community-store/shared';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { merchantService } from '../services/merchant-service';

const router = useRouter();
const authUser = ref<Omit<User, 'password'> | null>(merchantService.getAuthUser());

const merchant = ref<Merchant | null>(null);
const products = ref<Product[]>([]);
const orders = ref<Order[]>([]);
const couponRedeemRecords = ref<CouponRedeemRecord[]>([]);
const reviews = ref<ProductReview[]>([]);
const aftersales = ref<AfterSale[]>([]);

const merchantForm = reactive({
  phone: '',
  address: '',
  delivery_note: '',
  min_order_amount: 0,
  delivery_fee: 0,
  is_open: true,
  supports_pickup: true,
  pickup_fee: 0
});

const productDialogVisible = ref(false);
const editingProductId = ref<number | null>(null);
const orderDetailVisible = ref(false);
const activeOrder = ref<Order | null>(null);
const replyDialogVisible = ref(false);
const replyingReviewId = ref<number | null>(null);
const replyContent = ref('');
const rejectDialogVisible = ref(false);
const rejectingAfterSaleId = ref<number | null>(null);
const rejectReason = ref('');
const rejectRemark = ref('');
const productForm = reactive({
  name: '',
  price: 0,
  unit: '份',
  stock: -1,
  is_active: true,
  image_url: '/images/products/default.jpg',
  description: ''
});

const merchantSection = ref<{ $el: HTMLElement } | null>(null);
const productSection = ref<{ $el: HTMLElement } | null>(null);
const orderSection = ref<{ $el: HTMLElement } | null>(null);
const couponSection = ref<{ $el: HTMLElement } | null>(null);
const reviewSection = ref<{ $el: HTMLElement } | null>(null);
const aftersaleSection = ref<{ $el: HTMLElement } | null>(null);
const activeSection = ref('merchant');

const sections = [
  { key: 'merchant', label: '店铺信息' },
  { key: 'product', label: '商品管理' },
  { key: 'order', label: '订单管理' },
  { key: 'coupon', label: '核销记录' },
  { key: 'review', label: '评价管理' },
  { key: 'aftersale', label: '售后审核' }
];

const sectionRefs: Record<string, typeof merchantSection> = {
  merchant: merchantSection,
  product: productSection,
  order: orderSection,
  coupon: couponSection,
  review: reviewSection,
  aftersale: aftersaleSection
};

const merchantId = computed(() => authUser.value?.merchant_id ?? 0);

function scrollToSection(key: string): void {
  activeSection.value = key;
  const sectionRef = sectionRefs[key];
  if (sectionRef?.value?.$el) {
    sectionRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function formatMoney(value: number): string {
  return `¥${value.toFixed(2)}`;
}

function fulfillmentTypeLabel(type: FulfillmentType): string {
  return FULFILLMENT_TYPE_LABELS[type];
}

function statusLabel(status: OrderStatus, fulfillmentType?: FulfillmentType): string {
  if (status === 'confirmed' && fulfillmentType === 'pickup') {
    return '待备货';
  }
  return ORDER_STATUS_LABELS[status];
}

function nextStatuses(status: OrderStatus, fulfillmentType?: FulfillmentType): OrderStatus[] {
  const all = STATUS_TRANSITIONS[status];
  const filtered = all.filter((item) => item !== 'canceled');
  
  if (fulfillmentType === 'pickup') {
    return filtered.filter((s) => s !== 'delivering');
  }
  if (fulfillmentType === 'delivery') {
    return filtered.filter((s) => s !== 'pickup_ready');
  }
  
  return filtered;
}

function resetProductForm(): void {
  editingProductId.value = null;
  productForm.name = '';
  productForm.price = 0;
  productForm.unit = '份';
  productForm.stock = -1;
  productForm.is_active = true;
  productForm.image_url = '/images/products/default.jpg';
  productForm.description = '';
}

function assignMerchantForm(value: Merchant): void {
  merchantForm.phone = value.phone;
  merchantForm.address = value.address;
  merchantForm.delivery_note = value.delivery_note;
  merchantForm.min_order_amount = value.min_order_amount;
  merchantForm.delivery_fee = value.delivery_fee;
  merchantForm.is_open = value.is_open;
  merchantForm.supports_pickup = value.supports_pickup;
  merchantForm.pickup_fee = value.pickup_fee;
}

async function loadData(): Promise<void> {
  if (!merchantId.value) {
    ElMessage.error('商家信息缺失，请重新登录');
    return;
  }

  merchant.value = await merchantService.getMerchant(merchantId.value);
  if (!merchant.value) {
    ElMessage.error('商家不存在');
    return;
  }
  assignMerchantForm(merchant.value);

  products.value = await merchantService.listProducts(merchantId.value);
  orders.value = await merchantService.listOrdersByMerchant(merchantId.value);
  couponRedeemRecords.value = await merchantService.listCouponRedeemRecords(merchantId.value);
  reviews.value = await merchantService.listReviews(merchantId.value);
  aftersales.value = await merchantService.listAfterSales(merchantId.value);
}

async function saveMerchant(): Promise<void> {
  if (!merchant.value) {
    return;
  }
  merchant.value = await merchantService.updateMerchant(merchant.value.id, {
    phone: merchantForm.phone.trim(),
    address: merchantForm.address.trim(),
    delivery_note: merchantForm.delivery_note,
    min_order_amount: Number(merchantForm.min_order_amount),
    delivery_fee: Number(merchantForm.delivery_fee),
    is_open: merchantForm.is_open,
    supports_pickup: merchantForm.supports_pickup,
    pickup_fee: Number(merchantForm.pickup_fee)
  });
  ElMessage.success('店铺信息已保存');
}

function openCreateDialog(): void {
  resetProductForm();
  productDialogVisible.value = true;
}

function openEditDialog(product: Product): void {
  editingProductId.value = product.id;
  productForm.name = product.name;
  productForm.price = product.price;
  productForm.unit = product.unit;
  productForm.stock = product.stock;
  productForm.is_active = product.is_active;
  productForm.image_url = product.image_url;
  productForm.description = product.description ?? '';
  productDialogVisible.value = true;
}

async function saveProduct(): Promise<void> {
  if (!merchantId.value) {
    return;
  }
  if (!productForm.name.trim()) {
    ElMessage.error('商品名不能为空');
    return;
  }

  const payload = {
    merchant_id: merchantId.value,
    name: productForm.name.trim(),
    price: Number(productForm.price),
    unit: productForm.unit.trim() || '份',
    stock: Number(productForm.stock),
    is_active: productForm.is_active,
    image_url: productForm.image_url.trim() || '/images/products/default.jpg',
    description: productForm.description.trim()
  };

  if (editingProductId.value) {
    await merchantService.updateProduct(editingProductId.value, payload);
    ElMessage.success('商品已更新');
  } else {
    await merchantService.createProduct(payload);
    ElMessage.success('商品已新增');
  }

  productDialogVisible.value = false;
  resetProductForm();
  await loadData();
}

async function toggleProduct(product: Product): Promise<void> {
  await merchantService.updateProduct(product.id, {
    is_active: !product.is_active
  });
  ElMessage.success('商品状态已更新');
  await loadData();
}

async function updateOrderStatus(orderId: number, status: OrderStatus): Promise<void> {
  try {
    await merchantService.updateOrderStatus(orderId, status);
    ElMessage.success('订单状态已更新');
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

function openOrderDetail(order: Order): void {
  activeOrder.value = order;
  orderDetailVisible.value = true;
}

function openReplyDialog(reviewId: number): void {
  replyingReviewId.value = reviewId;
  replyContent.value = '';
  replyDialogVisible.value = true;
}

async function submitReply(): Promise<void> {
  if (!replyingReviewId.value) return;
  const content = replyContent.value.trim();
  if (!content) {
    ElMessage.error('回复内容不能为空');
    return;
  }
  if (content.length > 500) {
    ElMessage.error('回复内容不能超过 500 字');
    return;
  }
  try {
    await merchantService.replyReview({
      review_id: replyingReviewId.value,
      reply: content
    });
    ElMessage.success('回复成功');
    replyDialogVisible.value = false;
    replyingReviewId.value = null;
    replyContent.value = '';
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN');
}

function aftersaleStatusLabel(status: string): string {
  return AFTERSALE_STATUS_LABELS[status as keyof typeof AFTERSALE_STATUS_LABELS] ?? status;
}

function aftersaleReasonLabel(reason: string): string {
  return AFTERSALE_REASON_LABELS[reason as keyof typeof AFTERSALE_REASON_LABELS] ?? reason;
}

function aftersaleRejectReasonLabel(reason: string): string {
  if (!reason) return '';
  return AFTERSALE_REJECT_REASON_LABELS[reason as keyof typeof AFTERSALE_REJECT_REASON_LABELS] ?? reason;
}

async function approveAfterSale(aftersaleId: number): Promise<void> {
  try {
    await merchantService.reviewAfterSale(aftersaleId, 'approve');
    ElMessage.success('已同意售后申请，订单已退款');
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

function openRejectDialog(aftersaleId: number): void {
  rejectingAfterSaleId.value = aftersaleId;
  rejectReason.value = '';
  rejectRemark.value = '';
  rejectDialogVisible.value = true;
}

async function submitReject(): Promise<void> {
  if (!rejectingAfterSaleId.value) return;
  if (!rejectReason.value) {
    ElMessage.error('请选择拒绝原因');
    return;
  }
  try {
    await merchantService.reviewAfterSale(
      rejectingAfterSaleId.value,
      'reject',
      rejectReason.value,
      rejectRemark.value.trim()
    );
    ElMessage.success('已拒绝售后申请');
    rejectDialogVisible.value = false;
    rejectingAfterSaleId.value = null;
    rejectReason.value = '';
    rejectRemark.value = '';
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

function logout(): void {
  merchantService.logout();
  router.push('/login');
}

onMounted(loadData);
</script>
