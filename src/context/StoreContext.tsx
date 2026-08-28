import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product, ProductVariant, StoreSettings, DeliveryArea, Order, Coupon } from '../types/index.js';
import { Api } from '../services/api.js';

interface StoreContextType {
  product: Product | null;
  settings: StoreSettings | null;
  selectedVariant: ProductVariant | null;
  setSelectedVariant: (variant: ProductVariant) => void;
  quantity: number;
  setQuantity: (qty: number) => void;
  deliveryArea: DeliveryArea;
  setDeliveryArea: (area: DeliveryArea) => void;
  subtotal: number;
  deliveryCharge: number;
  totalPayable: number;
  appliedCoupon: Coupon | null;
  couponDiscount: number;
  couponError: string | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string; discount?: number }>;
  removeCoupon: () => void;
  activeCoupons: Coupon[];
  isLoading: boolean;
  error: string | null;
  refreshStoreData: () => Promise<void>;
  confirmedOrder: Order | null;
  setConfirmedOrder: (order: Order | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>('dhaka');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [prodData, settingsData, activeCoups] = await Promise.all([
        Api.getProducts(),
        Api.getSettings(),
        Api.getActiveCoupons(),
      ]);

      setProduct(prodData);
      setSettings(settingsData);
      setActiveCoupons(activeCoups || []);

      // Default select the bestValue variant or the first variant
      if (prodData.variants && prodData.variants.length > 0) {
        const best = prodData.variants.find((v) => v.bestValue) || prodData.variants[0];
        setSelectedVariant(best);
      }
    } catch (err: any) {
      console.error('Failed to load store data:', err);
      setError(err.message || 'Unable to connect to CLIXA store server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived calculations
  const unitPrice = selectedVariant ? selectedVariant.price : 1280;
  const subtotal = unitPrice * quantity;

  // Recalculate coupon discount whenever subtotal or applied coupon changes
  useEffect(() => {
    if (!appliedCoupon) {
      setCouponDiscount(0);
      return;
    }

    if (appliedCoupon.minOrderAmount && subtotal < appliedCoupon.minOrderAmount) {
      setCouponError(
        `কুপন '${appliedCoupon.code}' এর জন্য ন্যূনতম ৳${appliedCoupon.minOrderAmount.toLocaleString()} টাকার অর্ডার আবশ্যক`
      );
      setCouponDiscount(0);
      return;
    }

    setCouponError(null);
    let calculated = 0;
    if (appliedCoupon.discountType === 'fixed') {
      calculated = Math.min(subtotal, appliedCoupon.discountValue);
    } else if (appliedCoupon.discountType === 'percentage') {
      const p = (subtotal * appliedCoupon.discountValue) / 100;
      calculated =
        appliedCoupon.maxDiscountAmount && appliedCoupon.maxDiscountAmount > 0
          ? Math.min(subtotal, Math.min(p, appliedCoupon.maxDiscountAmount))
          : Math.min(subtotal, p);
    }
    setCouponDiscount(Math.round(calculated));
  }, [subtotal, appliedCoupon]);

  const applyCoupon = async (
    code: string
  ): Promise<{ success: boolean; message: string; discount?: number }> => {
    if (!code || !code.trim()) {
      return { success: false, message: 'অনুগ্রহ করে কুপন কোড লিখুন' };
    }
    try {
      const res = await Api.validateCoupon(code.trim(), subtotal);
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponDiscount(res.discount);
        setCouponError(null);
        return { success: true, message: res.message, discount: res.discount };
      } else {
        setCouponError(res.message);
        return { success: false, message: res.message };
      }
    } catch (err: any) {
      const msg = err.message || 'কুপন যাচাইকরণে ত্রুটি হয়েছে';
      setCouponError(msg);
      return { success: false, message: msg };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError(null);
  };

  const deliveryCharge =
    deliveryArea === 'dhaka'
      ? settings?.dhakaDeliveryCharge ?? 0
      : settings?.outsideDhakaDeliveryCharge ?? 130;

  const totalPayable = Math.max(0, subtotal - couponDiscount) + deliveryCharge;

  return (
    <StoreContext.Provider
      value={{
        product,
        settings,
        selectedVariant,
        setSelectedVariant,
        quantity,
        setQuantity,
        deliveryArea,
        setDeliveryArea,
        subtotal,
        deliveryCharge,
        totalPayable,
        appliedCoupon,
        couponDiscount,
        couponError,
        applyCoupon,
        removeCoupon,
        activeCoupons,
        isLoading,
        error,
        refreshStoreData: loadData,
        confirmedOrder,
        setConfirmedOrder,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
