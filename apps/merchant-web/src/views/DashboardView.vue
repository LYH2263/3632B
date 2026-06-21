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

    <el-card class="block" ref="promotionSection" data-testid="web-promotion-card">
      <template #header>
        <div class="block-header">
          <div class="block-title" data-testid="web-promotion-card-title">促销管理</div>
          <el-button type="primary" data-testid="web-promotion-open-create" @click="openCreatePromotionDialog">新增活动</el-button>
        </div>
      </template>

      <div class="table-wrapper">
      <el-table :data="promotions" stripe data-testid="web-promotion-table">
        <el-table-column prop="name" label="活动名称" min-width="160" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="promotionStatusType(scope.row.status)" size="small">
              {{ getPromotionStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="活动时间" min-width="320">
          <template #default="scope">{{ formatPromotionTimeRange(scope.row) }}</template>
        </el-table-column>
        <el-table-column label="商品数量" width="100">
          <template #default="scope">{{ scope.row.items.length }}</template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="scope">
            <el-space>
              <el-button
                size="small"
                :data-testid="`web-promotion-edit-${scope.row.id}`"
                @click="openEditPromotionDialog(scope.row)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                :data-testid="`web-promotion-delete-${scope.row.id}`"
                @click="deletePromotion(scope.row.id)"
              >
                删除
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <div v-if="!promotions.length" style="text-align: center; padding: 30px 0; color: #909399;">
        暂无促销活动
      </div>
    </el-card>

    <el-card class="block" ref="deliverySlotSection" data-testid="web-delivery-slot-card">
      <template #header>
        <div class="block-header">
          <div class="block-title" data-testid="web-delivery-slot-card-title">配送时段配置</div>
          <el-button type="primary" data-testid="web-delivery-slot-open-create" @click="openCreateDeliverySlotDialog">新增时段</el-button>
        </div>
      </template>

      <div class="table-wrapper">
      <el-table :data="deliverySlots" stripe data-testid="web-delivery-slot-table">
        <el-table-column label="时段" min-width="160">
          <template #default="scope">{{ scope.row.start_time }} - {{ scope.row.end_time }}</template>
        </el-table-column>
        <el-table-column label="容量" width="100">
          <template #default="scope">{{ scope.row.capacity }} 单</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.is_active ? 'success' : 'info'" size="small">
              {{ scope.row.is_active ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="scope">
            <el-space>
              <el-button
                size="small"
                :data-testid="`web-delivery-slot-edit-${scope.row.id}`"
                @click="openEditDeliverySlotDialog(scope.row)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="warning"
                :data-testid="`web-delivery-slot-toggle-${scope.row.id}`"
                @click="toggleDeliverySlot(scope.row)"
              >
                {{ scope.row.is_active ? '停用' : '启用' }}
              </el-button>
              <el-button
                size="small"
                type="danger"
                :data-testid="`web-delivery-slot-delete-${scope.row.id}`"
                @click="deleteDeliverySlot(scope.row.id)"
              >
                删除
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <div v-if="!deliverySlots.length" style="text-align: center; padding: 30px 0; color: #909399;">
        暂无配送时段配置
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
        <el-table-column label="预约送达" min-width="180">
          <template #default="scope">
            <span v-if="scope.row.scheduled_date && scope.row.scheduled_slot" style="color: #409eff;">
              {{ formatScheduledInfo(scope.row) }}
            </span>
            <span v-else style="color: #909399;">-</span>
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
      v-model="promotionDialogVisible"
      :title="editingPromotionId ? '编辑促销活动' : '新增促销活动'"
      width="720px"
      data-testid="web-promotion-dialog"
    >
      <el-form :model="promotionForm" label-width="90px" data-testid="web-promotion-form">
        <el-form-item label="活动名称">
          <el-input v-model="promotionForm.name" data-testid="web-promotion-name" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="活动描述">
          <el-input v-model="promotionForm.description" data-testid="web-promotion-description" type="textarea" :rows="2" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="promotionForm.start_at"
            type="datetime"
            placeholder="选择开始时间"
            data-testid="web-promotion-start"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="promotionForm.end_at"
            type="datetime"
            placeholder="选择结束时间"
            data-testid="web-promotion-end"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="选择商品">
          <el-select
            v-model="selectedProductIds"
            multiple
            placeholder="请选择参与活动的商品"
            data-testid="web-promotion-products"
            style="width: 100%;"
            @change="onProductSelectionChange"
          >
            <el-option
              v-for="product in products.filter(p => p.is_active)"
              :key="product.id"
              :label="`${product.name} (原价: ¥${product.price.toFixed(2)}/${product.unit})`"
              :value="product.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="promotionForm.items.length > 0" label="活动价格">
          <div style="width: 100%;">
            <el-table :data="promotionForm.items" border size="small">
              <el-table-column prop="product_id" label="商品ID" width="80" />
              <el-table-column label="商品名称" min-width="140">
                <template #default="scope">
                  {{ getProductName(scope.row.product_id) }}
                </template>
              </el-table-column>
              <el-table-column label="原价" width="100">
                <template #default="scope">
                  ¥{{ getProductPrice(scope.row.product_id).toFixed(2) }}
                </template>
              </el-table-column>
              <el-table-column label="活动价" width="160">
                <template #default="scope">
                  <el-input-number
                    v-model="scope.row.promo_price"
                    :min="0.01"
                    :step="0.1"
                    :precision="2"
                    size="small"
                    :data-testid="`web-promotion-item-price-${scope.row.product_id}`"
                  />
                </template>
              </el-table-column>
              <el-table-column label="活动库存" width="160">
                <template #default="scope">
                  <el-input-number
                    v-model="scope.row.promo_stock"
                    :min="-1"
                    :step="1"
                    size="small"
                    :data-testid="`web-promotion-item-stock-${scope.row.product_id}`"
                  />
                  <span style="color: #909399; font-size: 12px;">-1 表示不限</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button data-testid="web-promotion-cancel" @click="promotionDialogVisible = false">取消</el-button>
        <el-button type="primary" data-testid="web-promotion-save" @click="savePromotion">保存</el-button>
      </template>
    </el-dialog>

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
      v-model="deliverySlotDialogVisible"
      :title="editingDeliverySlotId ? '编辑配送时段' : '新增配送时段'"
      width="480px"
      data-testid="web-delivery-slot-dialog"
    >
      <el-form :model="deliverySlotForm" label-width="90px" data-testid="web-delivery-slot-form">
        <el-form-item label="开始时间">
          <el-time-picker
            v-model="deliverySlotForm.start_time"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选择开始时间"
            data-testid="web-delivery-slot-start"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-time-picker
            v-model="deliverySlotForm.end_time"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选择结束时间"
            data-testid="web-delivery-slot-end"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="容量">
          <el-input-number
            v-model="deliverySlotForm.capacity"
            :min="1"
            :max="999"
            :step="1"
            data-testid="web-delivery-slot-capacity"
          />
          <span style="margin-left: 8px; color: #909399; font-size: 12px;">单</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="deliverySlotForm.is_active"
            data-testid="web-delivery-slot-active"
            active-text="启用"
            inactive-text="停用"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button data-testid="web-delivery-slot-cancel" @click="deliverySlotDialogVisible = false">取消</el-button>
        <el-button type="primary" data-testid="web-delivery-slot-save" @click="saveDeliverySlot">保存</el-button>
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
        <p v-if="activeOrder.fulfillment_type === 'delivery' && activeOrder.scheduled_date && activeOrder.scheduled_slot" style="color: #409eff;">
          预约送达：{{ formatScheduledInfo(activeOrder) }}
        </p>
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

    <el-card class="block" ref="ticketSection" data-testid="web-ticket-card">
      <template #header>
        <div class="block-title" data-testid="web-ticket-card-title">工单管理</div>
      </template>

      <div class="table-wrapper">
      <el-table :data="tickets" stripe data-testid="web-ticket-table">
        <el-table-column prop="id" label="工单号" width="80" />
        <el-table-column label="问题类型" width="100">
          <template #default="scope">{{ ticketTypeLabel(scope.row.type) }}</template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column label="买家" width="120">
          <template #default="scope">{{ scope.row.buyer_nickname }}</template>
        </el-table-column>
        <el-table-column label="关联订单" width="160">
          <template #default="scope">
            <span v-if="scope.row.order_no">{{ scope.row.order_no }}</span>
            <span v-else style="color: #909399;">无</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="ticketStatusType(scope.row.status)" size="small">
              {{ ticketStatusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最新消息" min-width="160">
          <template #default="scope">
            <div v-if="scope.row.messages && scope.row.messages.length">
              <div style="font-size: 12px; color: #606266;">
                {{ scope.row.messages[scope.row.messages.length - 1].content }}
              </div>
              <div style="font-size: 11px; color: #909399; margin-top: 2px;">
                {{ new Date(scope.row.messages[scope.row.messages.length - 1].created_at).toLocaleString('zh-CN') }}
              </div>
            </div>
            <span v-else style="color: #909399;">暂无消息</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="scope">
            {{ new Date(scope.row.created_at).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              type="primary"
              :data-testid="`web-ticket-detail-${scope.row.id}`"
              @click="openTicketDetail(scope.row)"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <div v-if="!tickets.length" style="text-align: center; padding: 30px 0; color: #909399;">
        暂无工单
      </div>

      <div v-if="ticketsTotalPages > 1" style="text-align: center; margin-top: 20px;">
        <el-pagination
          layout="prev, pager, next"
          :total="ticketsTotal"
          :page-size="ticketsPageSize"
          :current-page="ticketsPage"
          @current-change="handleTicketsPageChange"
          background
        />
      </div>
    </el-card>

    <el-dialog
      v-model="ticketDetailVisible"
      title="工单详情"
      width="720px"
      data-testid="web-ticket-detail-dialog"
    >
      <template v-if="activeTicket">
        <div class="ticket-detail-header">
          <div class="ticket-detail-info">
            <div class="ticket-detail-title">{{ activeTicket.title }}</div>
            <div class="ticket-detail-meta">
              <el-tag :type="ticketStatusType(activeTicket.status)" size="small">
                {{ ticketStatusLabel(activeTicket.status) }}
              </el-tag>
              <span style="margin-left: 8px; color: #909399;">
                工单 #{{ activeTicket.id }} · {{ ticketTypeLabel(activeTicket.type) }}
              </span>
            </div>
          </div>
        </div>

        <div class="ticket-detail-section">
          <div class="ticket-detail-label">问题描述</div>
          <div class="ticket-detail-description">{{ activeTicket.description }}</div>
        </div>

        <div v-if="activeTicket.order_no" class="ticket-detail-section">
          <div class="ticket-detail-label">关联订单</div>
          <div class="ticket-detail-value">{{ activeTicket.order_no }}</div>
        </div>

        <div class="ticket-detail-section">
          <div class="ticket-detail-label">
            消息记录
            <span style="color: #909399; font-weight: normal; font-size: 12px;">
              （共 {{ activeTicket.messages.length }} 条）
            </span>
          </div>
          <div class="ticket-messages">
            <div
              v-for="msg in activeTicket.messages"
              :key="msg.id"
              class="ticket-message"
              :class="{ 'is-self': msg.sender_role === 'merchant' }"
            >
              <div class="ticket-message-header">
                <span class="ticket-message-sender">
                  {{ msg.sender_nickname }}
                  <el-tag size="mini" :type="msg.sender_role === 'merchant' ? 'primary' : 'success'">
                    {{ msg.sender_role === 'merchant' ? '商家' : '买家' }}
                  </el-tag>
                </span>
                <span class="ticket-message-time">
                  {{ new Date(msg.created_at).toLocaleString('zh-CN') }}
                </span>
              </div>
              <div class="ticket-message-content">{{ msg.content }}</div>
            </div>
            <div v-if="!activeTicket.messages.length" class="ticket-empty">
              暂无消息记录
            </div>
          </div>
        </div>

        <div v-if="activeTicket.status !== 'closed'" class="ticket-reply-section">
          <el-input
            v-model="ticketMessageContent"
            type="textarea"
            :rows="3"
            maxlength="1000"
            show-word-limit
            placeholder="请输入回复内容..."
            data-testid="web-ticket-reply-input"
          />
          <div class="ticket-reply-actions">
            <el-space>
              <el-button
                type="primary"
                data-testid="web-ticket-reply-send"
                @click="sendTicketMessage"
              >
                发送回复
              </el-button>
              <el-button
                v-for="next in getNextTicketStatuses(activeTicket.status)"
                :key="next"
                :data-testid="`web-ticket-status-${activeTicket.id}-${next}`"
                @click="updateTicketStatus(activeTicket.id, next)"
              >
                {{ ticketStatusLabel(next) }}
              </el-button>
            </el-space>
          </div>
        </div>

        <div v-else class="ticket-closed-notice">
          <el-alert
            title="该工单已关闭，无法继续回复"
            type="info"
            :closable="false"
            show-icon
          />
        </div>
      </template>

      <template #footer>
        <el-button data-testid="web-ticket-detail-close" @click="ticketDetailVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>

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
  formatPromotionTimeRange,
  getPromotionStatusText,
  ORDER_STATUS_LABELS,
  STATUS_TRANSITIONS,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type AfterSale,
  type CouponRedeemRecord,
  type CreatePromotionPayload,
  type CreateTicketMessagePayload,
  type DeliverySlot,
  type FulfillmentType,
  type Merchant,
  type Order,
  type OrderStatus,
  type Product,
  type ProductReview,
  type Promotion,
  type PromotionStatus,
  type Ticket,
  type TicketStatus,
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
const promotions = ref<Promotion[]>([]);
const deliverySlots = ref<DeliverySlot[]>([]);
const deliverySlotDialogVisible = ref(false);
const editingDeliverySlotId = ref<number | null>(null);
const deliverySlotForm = reactive({
  start_time: '09:00',
  end_time: '11:00',
  capacity: 10,
  is_active: true
});
const tickets = ref<Ticket[]>([]);
const ticketsPage = ref(1);
const ticketsPageSize = ref(10);
const ticketsTotal = ref(0);
const ticketsTotalPages = ref(0);

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

const promotionDialogVisible = ref(false);
const editingPromotionId = ref<number | null>(null);
const promotionForm = reactive({
  name: '',
  description: '',
  start_at: '',
  end_at: '',
  items: [] as Array<{ product_id: number; promo_price: number; promo_stock: number }>
});
const selectedProductIds = ref<number[]>([]);

const ticketDetailVisible = ref(false);
const activeTicket = ref<Ticket | null>(null);
const ticketMessageContent = ref('');
const ticketStatusFilter = ref<TicketStatus | ''>('');

const ticketSection = ref<{ $el: HTMLElement } | null>(null);

const promotionSection = ref<{ $el: HTMLElement } | null>(null);

const deliverySlotSection = ref<{ $el: HTMLElement } | null>(null);

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
  { key: 'promotion', label: '促销管理' },
  { key: 'deliverySlot', label: '时段配置' },
  { key: 'order', label: '订单管理' },
  { key: 'coupon', label: '核销记录' },
  { key: 'review', label: '评价管理' },
  { key: 'aftersale', label: '售后审核' },
  { key: 'ticket', label: '工单管理' }
];

const sectionRefs: Record<string, typeof merchantSection> = {
  merchant: merchantSection,
  product: productSection,
  promotion: promotionSection,
  deliverySlot: deliverySlotSection,
  order: orderSection,
  coupon: couponSection,
  review: reviewSection,
  aftersale: aftersaleSection,
  ticket: ticketSection
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
  promotions.value = await merchantService.listPromotions(merchantId.value);
  deliverySlots.value = await merchantService.listDeliverySlots(merchantId.value);
  await loadTickets();
}

async function loadTickets(): Promise<void> {
  if (!merchantId.value) return;
  const result = await merchantService.listTickets(merchantId.value, ticketsPage.value, ticketsPageSize.value);
  tickets.value = result.results as unknown as Ticket[];
  ticketsTotal.value = result.count;
  ticketsTotalPages.value = result.total_pages;
}

function ticketTypeLabel(type: string): string {
  return TICKET_TYPE_LABELS[type as keyof typeof TICKET_TYPE_LABELS] ?? type;
}

function ticketStatusLabel(status: string): string {
  return TICKET_STATUS_LABELS[status as keyof typeof TICKET_STATUS_LABELS] ?? status;
}

function ticketStatusType(status: string): 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    open: 'warning',
    processing: 'warning',
    resolved: 'success',
    closed: 'info'
  };
  return map[status] ?? 'info';
}

function openTicketDetail(ticket: Ticket): void {
  activeTicket.value = { ...ticket, messages: [...ticket.messages] };
  ticketMessageContent.value = '';
  ticketDetailVisible.value = true;
}

async function updateTicketStatus(ticketId: number, status: TicketStatus): Promise<void> {
  try {
    await merchantService.updateTicketStatus(ticketId, status);
    ElMessage.success(`工单状态已更新为「${ticketStatusLabel(status)}」`);
    await loadTickets();
    if (activeTicket.value?.id === ticketId) {
      activeTicket.value.status = status;
    }
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

async function sendTicketMessage(): Promise<void> {
  if (!activeTicket.value) return;
  const content = ticketMessageContent.value.trim();
  if (!content) {
    ElMessage.error('回复内容不能为空');
    return;
  }
  if (content.length > 1000) {
    ElMessage.error('回复内容不能超过 1000 字');
    return;
  }
  try {
    const payload: CreateTicketMessagePayload = {
      ticket_id: activeTicket.value.id,
      sender_id: authUser.value!.id,
      content
    };
    const message = await merchantService.createTicketMessage(payload);
    activeTicket.value.messages.push(message);
    if (activeTicket.value.status === 'open') {
      activeTicket.value.status = 'processing';
    }
    ticketMessageContent.value = '';
    await loadTickets();
    ElMessage.success('回复已发送');
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

function getNextTicketStatuses(status: TicketStatus): TicketStatus[] {
  const transitions: Record<TicketStatus, TicketStatus[]> = {
    open: ['processing', 'resolved', 'closed'],
    processing: ['resolved', 'closed'],
    resolved: ['closed', 'processing'],
    closed: []
  };
  return transitions[status] ?? [];
}

async function handleTicketsPageChange(page: number): Promise<void> {
  ticketsPage.value = page;
  await loadTickets();
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

function promotionStatusType(status: PromotionStatus): 'success' | 'warning' | 'info' {
  const map: Record<string, 'success' | 'warning' | 'info'> = {
    active: 'success',
    draft: 'warning',
    ended: 'info'
  };
  return map[status] ?? 'info';
}

function getProductName(productId: number): string {
  const product = products.value.find((p) => p.id === productId);
  return product?.name ?? '';
}

function getProductPrice(productId: number): number {
  const product = products.value.find((p) => p.id === productId);
  return product?.price ?? 0;
}

function resetPromotionForm(): void {
  editingPromotionId.value = null;
  promotionForm.name = '';
  promotionForm.description = '';
  promotionForm.start_at = '';
  promotionForm.end_at = '';
  promotionForm.items = [];
  selectedProductIds.value = [];
}

function onProductSelectionChange(): void {
  const existingIds = promotionForm.items.map((item) => item.product_id);
  const toRemove = existingIds.filter((id) => !selectedProductIds.value.includes(id));
  const toAdd = selectedProductIds.value.filter((id) => !existingIds.includes(id));

  promotionForm.items = promotionForm.items.filter((item) => !toRemove.includes(item.product_id));

  for (const productId of toAdd) {
    const product = products.value.find((p) => p.id === productId);
    promotionForm.items.push({
      product_id: productId,
      promo_price: product ? Number((product.price * 0.8).toFixed(2)) : 0,
      promo_stock: -1
    });
  }
}

function openCreatePromotionDialog(): void {
  resetPromotionForm();
  promotionDialogVisible.value = true;
}

function openEditPromotionDialog(promotion: Promotion): void {
  resetPromotionForm();
  editingPromotionId.value = promotion.id;
  promotionForm.name = promotion.name;
  promotionForm.description = promotion.description;
  promotionForm.start_at = promotion.start_at;
  promotionForm.end_at = promotion.end_at;
  promotionForm.items = promotion.items.map((item) => ({
    product_id: item.product_id,
    promo_price: item.promo_price,
    promo_stock: item.promo_stock
  }));
  selectedProductIds.value = promotion.items.map((item) => item.product_id);
  promotionDialogVisible.value = true;
}

async function savePromotion(): Promise<void> {
  if (!merchantId.value) return;
  if (!promotionForm.name.trim()) {
    ElMessage.error('活动名称不能为空');
    return;
  }
  if (!promotionForm.start_at || !promotionForm.end_at) {
    ElMessage.error('请选择活动时间');
    return;
  }
  if (new Date(promotionForm.start_at) >= new Date(promotionForm.end_at)) {
    ElMessage.error('开始时间必须早于结束时间');
    return;
  }
  if (promotionForm.items.length === 0) {
    ElMessage.error('请至少选择一个商品');
    return;
  }
  for (const item of promotionForm.items) {
    if (item.promo_price <= 0) {
      ElMessage.error(`商品 ${getProductName(item.product_id)} 的活动价必须大于0`);
      return;
    }
  }

  const payload: CreatePromotionPayload = {
    merchant_id: merchantId.value,
    name: promotionForm.name.trim(),
    description: promotionForm.description.trim(),
    start_at: promotionForm.start_at,
    end_at: promotionForm.end_at,
    items: promotionForm.items.map((item) => ({
      product_id: item.product_id,
      promo_price: item.promo_price,
      promo_stock: item.promo_stock
    }))
  };

  try {
    if (editingPromotionId.value) {
      await merchantService.updatePromotion(editingPromotionId.value, payload);
      ElMessage.success('活动已更新');
    } else {
      await merchantService.createPromotion(payload);
      ElMessage.success('活动已创建');
    }
    promotionDialogVisible.value = false;
    resetPromotionForm();
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

async function deletePromotion(promotionId: number): Promise<void> {
  try {
    await merchantService.deletePromotion(promotionId);
    ElMessage.success('活动已删除');
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

function resetDeliverySlotForm(): void {
  editingDeliverySlotId.value = null;
  deliverySlotForm.start_time = '09:00';
  deliverySlotForm.end_time = '11:00';
  deliverySlotForm.capacity = 10;
  deliverySlotForm.is_active = true;
}

function openCreateDeliverySlotDialog(): void {
  resetDeliverySlotForm();
  deliverySlotDialogVisible.value = true;
}

function openEditDeliverySlotDialog(slot: DeliverySlot): void {
  editingDeliverySlotId.value = slot.id;
  deliverySlotForm.start_time = slot.start_time;
  deliverySlotForm.end_time = slot.end_time;
  deliverySlotForm.capacity = slot.capacity;
  deliverySlotForm.is_active = slot.is_active;
  deliverySlotDialogVisible.value = true;
}

async function saveDeliverySlot(): Promise<void> {
  if (!merchantId.value) return;
  if (!deliverySlotForm.start_time || !deliverySlotForm.end_time) {
    ElMessage.error('请填写时段时间');
    return;
  }
  if (deliverySlotForm.start_time >= deliverySlotForm.end_time) {
    ElMessage.error('开始时间必须早于结束时间');
    return;
  }
  if (deliverySlotForm.capacity < 1) {
    ElMessage.error('容量必须大于0');
    return;
  }

  try {
    if (editingDeliverySlotId.value) {
      await merchantService.updateDeliverySlot(editingDeliverySlotId.value, {
        start_time: deliverySlotForm.start_time,
        end_time: deliverySlotForm.end_time,
        capacity: deliverySlotForm.capacity,
        is_active: deliverySlotForm.is_active
      });
      ElMessage.success('时段已更新');
    } else {
      await merchantService.createDeliverySlot(merchantId.value, {
        start_time: deliverySlotForm.start_time,
        end_time: deliverySlotForm.end_time,
        capacity: deliverySlotForm.capacity,
        is_active: deliverySlotForm.is_active
      });
      ElMessage.success('时段已创建');
    }
    deliverySlotDialogVisible.value = false;
    resetDeliverySlotForm();
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

async function deleteDeliverySlot(slotId: number): Promise<void> {
  try {
    await merchantService.deleteDeliverySlot(slotId);
    ElMessage.success('时段已删除');
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

async function toggleDeliverySlot(slot: DeliverySlot): Promise<void> {
  try {
    await merchantService.updateDeliverySlot(slot.id, {
      is_active: !slot.is_active
    });
    ElMessage.success('时段状态已更新');
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

function formatScheduledInfo(order: Order): string {
  if (!order.scheduled_date || !order.scheduled_slot) {
    return '无预约';
  }
  const slot = typeof order.scheduled_slot === 'object' ? order.scheduled_slot : null;
  if (!slot) return '无预约';
  return `${order.scheduled_date} ${slot.start_time}-${slot.end_time}`;
}

function logout(): void {
  merchantService.logout();
  router.push('/login');
}

onMounted(loadData);
</script>

<style scoped>
.ticket-detail-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.ticket-detail-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.ticket-detail-meta {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.ticket-detail-section {
  margin-bottom: 20px;
}

.ticket-detail-label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.ticket-detail-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.ticket-detail-value {
  font-size: 14px;
  color: #606266;
}

.ticket-messages {
  max-height: 400px;
  overflow-y: auto;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.ticket-message {
  margin-bottom: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.ticket-message.is-self {
  background: #ecf5ff;
  border-color: #b3d8ff;
}

.ticket-message:last-child {
  margin-bottom: 0;
}

.ticket-message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ticket-message-sender {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.ticket-message-time {
  font-size: 12px;
  color: #909399;
}

.ticket-message-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.ticket-empty {
  text-align: center;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
}

.ticket-reply-section {
  margin-top: 20px;
}

.ticket-reply-actions {
  margin-top: 12px;
  text-align: right;
}

.ticket-closed-notice {
  margin-top: 20px;
}
</style>
