import { toMoney } from './number';
import type {
  CouponTemplate,
  CouponValidationResult,
  UserCoupon
} from '../types';

export function isCouponExpired(template: CouponTemplate, now: Date = new Date()): boolean {
  const validTo = new Date(template.valid_to);
  return now > validTo;
}

export function isCouponActive(template: CouponTemplate, now: Date = new Date()): boolean {
  const validFrom = new Date(template.valid_from);
  const validTo = new Date(template.valid_to);
  return now >= validFrom && now <= validTo;
}

export function calculateThresholdAmount(
  template: CouponTemplate,
  itemsAmount: number,
  deliveryFee: number
): number {
  if (template.include_delivery_fee) {
    return toMoney(itemsAmount + deliveryFee);
  }
  return toMoney(itemsAmount);
}

export function validateCouponTemplate(
  template: CouponTemplate,
  itemsAmount: number,
  deliveryFee: number,
  now: Date = new Date()
): CouponValidationResult {
  const errors: string[] = [];

  if (!isCouponActive(template, now)) {
    if (now < new Date(template.valid_from)) {
      errors.push('优惠券尚未生效');
    } else {
      errors.push('优惠券已过期');
    }
    return {
      valid: false,
      errors,
      discount_amount: 0,
      final_amount: toMoney(itemsAmount + deliveryFee)
    };
  }

  const thresholdAmount = calculateThresholdAmount(template, itemsAmount, deliveryFee);
  if (thresholdAmount < template.threshold_amount) {
    const feeNote = template.include_delivery_fee ? '（含配送费）' : '';
    errors.push(
      `未达到使用门槛：满 ¥${template.threshold_amount.toFixed(2)}${feeNote}可用，当前 ¥${thresholdAmount.toFixed(2)}${feeNote}`
    );
    return {
      valid: false,
      errors,
      discount_amount: 0,
      final_amount: toMoney(itemsAmount + deliveryFee)
    };
  }

  const discountAmount = template.discount_amount;
  const totalBeforeDiscount = toMoney(itemsAmount + deliveryFee);
  const finalAmount = Math.max(0, toMoney(totalBeforeDiscount - discountAmount));

  return {
    valid: true,
    errors: [],
    discount_amount: toMoney(discountAmount),
    final_amount: finalAmount
  };
}

export function validateUserCoupon(
  userCoupon: UserCoupon,
  itemsAmount: number,
  deliveryFee: number,
  now: Date = new Date()
): CouponValidationResult {
  const errors: string[] = [];

  if (userCoupon.status === 'used') {
    errors.push('优惠券已使用');
    return {
      valid: false,
      errors,
      discount_amount: 0,
      final_amount: toMoney(itemsAmount + deliveryFee)
    };
  }

  if (userCoupon.status === 'expired') {
    errors.push('优惠券已过期');
    return {
      valid: false,
      errors,
      discount_amount: 0,
      final_amount: toMoney(itemsAmount + deliveryFee)
    };
  }

  return validateCouponTemplate(userCoupon.template, itemsAmount, deliveryFee, now);
}

export function filterAvailableCoupons(
  userCoupons: UserCoupon[],
  itemsAmount: number,
  deliveryFee: number,
  now: Date = new Date()
): UserCoupon[] {
  return userCoupons.filter((coupon) => {
    if (coupon.status !== 'available') {
      return false;
    }
    const result = validateUserCoupon(coupon, itemsAmount, deliveryFee, now);
    return result.valid;
  });
}

export function sortCouponsByDiscount(userCoupons: UserCoupon[]): UserCoupon[] {
  return [...userCoupons].sort(
    (a, b) => b.template.discount_amount - a.template.discount_amount
  );
}
