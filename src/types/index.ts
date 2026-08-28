export type DeliveryArea = 'dhaka' | 'outside_dhaka';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface StatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  size: string; // e.g. "20ml", "30ml"
  price: number; // Discounted / Selling Price (বিক্রয় মূল্য)
  regularPrice?: number; // Real / Regular Original Price (আসল বা রেগুলার মূল্য)
  bestValue?: boolean;
  inStock: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  sku?: string;
  imageUrl?: string;
}

export interface Coupon {
  id: string;
  code: string; // e.g. "CLIXA50", "SAVE10", "EID100"
  discountType: 'fixed' | 'percentage'; // Fixed in BDT (৳) or Percentage (%)
  discountValue: number; // e.g. 50 for ৳50 or 10 for 10%
  minOrderAmount?: number; // Minimum subtotal required in BDT (৳)
  maxDiscountAmount?: number; // Optional cap for percentage discounts
  isActive: boolean;
  expiryDate?: string; // ISO date or YYYY-MM-DD
  usageCount?: number;
  usageLimit?: number; // Maximum times can be used
  description?: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  purpose: string;
  imageUrl?: string;
  images?: string[];
  variants: ProductVariant[];
  features: string[];
  howToUse: {
    step: number;
    title: string;
    description: string;
  }[];
  specifications: {
    label: string;
    value: string;
  }[];
  visible: boolean;
}

export interface Order {
  id: string; // e.g. "CLX-2026-00101"
  createdAt: string;
  customerName: string;
  phone: string;
  fullAddress: string;
  district: string;
  deliveryArea: DeliveryArea;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  variantSize: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  couponCode?: string;
  couponDiscount?: number;
  originalSubtotal?: number;
  deliveryCharge: number;
  totalPayable: number;
  paymentMethod: 'COD';
  orderNote?: string;
  status: OrderStatus;
  statusHistory: StatusHistoryItem[];
  adminNotes?: string;
  syncedToGoogleSheets?: boolean;
}

export interface StoreSettings {
  storeName: string;
  brandName: string;
  tagline: string;
  whatsappNumber: string;
  supportPhone: string;
  supportEmail: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  dhakaDeliveryCharge: number;
  outsideDhakaDeliveryCharge: number;
  dhakaDeliveryTime: string;
  outsideDhakaDeliveryTime: string;
  currencySymbol: string;
  returnPolicy: string;
  cancellationPolicy: string;
  deliveryPolicy: string;
  codPolicy: string;
  googleSheetsWebhookUrl: string;
}

export interface PublicOrderTrackingResponse {
  id: string;
  maskedCustomerName: string;
  maskedPhone: string;
  productName: string;
  variantSize: string;
  quantity: number;
  totalPayable: number;
  deliveryArea: DeliveryArea;
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  estimatedDelivery: string;
  createdAt: string;
}

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  todayOrders: number;
  todayRevenue: number;
}

export type Language = 'en' | 'bn';
