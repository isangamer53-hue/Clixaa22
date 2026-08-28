import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  Order,
  StoreSettings,
  Product,
  OrderStatus,
  PublicOrderTrackingResponse,
  AdminStats,
  Coupon,
} from '../src/types/index.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const COUPONS_FILE = path.join(DATA_DIR, 'coupons.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'coup-clixa50',
    code: 'CLIXA50',
    discountType: 'fixed',
    discountValue: 50,
    minOrderAmount: 1000,
    isActive: true,
    description: '৳৫০ ইনস্ট্যান্ট ডিসকাউন্ট (ন্যূনতম ১,০০০ টাকার অর্ডারে)',
    usageCount: 14,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coup-save10',
    code: 'SAVE10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 1200,
    maxDiscountAmount: 200,
    isActive: true,
    description: '১০% স্পেশাল ছাড় (সর্বোচ্চ ৳২০০ পর্যন্ত)',
    usageCount: 8,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coup-offer100',
    code: 'OFFER100',
    discountType: 'fixed',
    discountValue: 100,
    minOrderAmount: 2000,
    isActive: true,
    description: '৳১০০ মেগা সেভিংস ছাড় (২ বা ততোধিক অর্ডারে)',
    usageCount: 5,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'CLIXA Official Store',
  brandName: 'CLIXA',
  tagline: 'Keep clothing & hair neat and properly positioned',
  whatsappNumber: '01971442479',
  supportPhone: '01971442479',
  supportEmail: 'support@clixabd.com',
  facebookUrl: 'https://facebook.com',
  instagramUrl: 'https://instagram.com',
  tiktokUrl: '',
  dhakaDeliveryCharge: 0,
  outsideDhakaDeliveryCharge: 130,
  dhakaDeliveryTime: 'Approx. 2 days',
  outsideDhakaDeliveryTime: 'Approx. 3–4 days',
  currencySymbol: '৳',
  returnPolicy:
    'Please inspect your package in front of the delivery agent. If the item is damaged or incorrect, you may return it immediately upon delivery.',
  cancellationPolicy:
    'Orders can be cancelled before dispatch by contacting our customer support hotline or WhatsApp with your Order ID.',
  deliveryPolicy:
    'Free delivery inside Dhaka (approx. 2 days). Delivery charge of ৳130 applies for areas outside Dhaka (approx. 3–4 days). All deliveries are fulfilled via trusted courier partners with Cash on Delivery.',
  codPolicy:
    'Cash on Delivery (COD) available nationwide. No advance payment required. Pay full amount to the delivery rider only upon receiving the product.',
  googleSheetsWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
};

const DEFAULT_PRODUCT: Product = {
  id: 'clixa-roll-on-body-adhesive',
  name: 'CLIXA Roll-On Body Adhesive',
  subtitle: 'Premium Clothing & Hair Position Solution',
  tagline: 'A roll-on adhesive solution designed to help keep clothing and hair neat and properly positioned.',
  description:
    'CLIXA Roll-On Body Adhesive is specially formulated to provide a clean, secure, and flexible hold for clothing, necklines, collars, button gaps, and flyaway hair. Designed with an easy-glide roll-on applicator that washes out cleanly with water.',
  purpose:
    'Keeps clothing styles, open necklines, shirt collars, dress straps, and flyaway hair in their proper position all day without fabric damage.',
  variants: [
    {
      id: 'var-20ml',
      name: '20ml Pocket Pack',
      size: '20ml',
      price: 1280,
      regularPrice: 1500,
      bestValue: false,
      inStock: true,
      stockQuantity: 18,
      lowStockThreshold: 10,
      sku: 'CLX-20ML',
    },
    {
      id: 'var-30ml',
      name: '30ml Value Pack',
      size: '30ml',
      price: 1380,
      regularPrice: 1650,
      bestValue: true,
      inStock: true,
      stockQuantity: 6,
      lowStockThreshold: 10,
      sku: 'CLX-30ML',
    },
  ],
  features: [
    'Convenient roll-on applicator for targeted, mess-free application',
    'Gentle hold that moves comfortably with your body',
    'Easily washes off skin and fabrics with warm water and soap',
    'Leaves no sticky residue or fabric stains',
    'Compact, travel-friendly bottle for on-the-go styling confidence',
  ],
  howToUse: [
    {
      step: 1,
      title: 'Clean & Prep',
      description: 'Ensure skin and fabric area are clean, dry, and free of oils, lotions, or powders.',
    },
    {
      step: 2,
      title: 'Apply Roll-On',
      description: 'Roll a smooth, even layer of CLIXA adhesive directly onto the skin or fabric edge.',
    },
    {
      step: 3,
      title: 'Position & Press',
      description: 'Press clothing or hair firmly against the adhesive area for 15-20 seconds to bond.',
    },
    {
      step: 4,
      title: 'Easy Removal',
      description: 'Simply peel off gently and rinse with warm water and mild soap when finished.',
    },
  ],
  specifications: [
    { label: 'Product Type', value: 'Roll-On Body & Fabric Adhesive' },
    { label: 'Available Sizes', value: '20ml / 30ml' },
    { label: 'Application Method', value: 'Roll-On Ball Applicator' },
    { label: 'Washability', value: '100% Water Soluble & Soap Washable' },
    { label: 'Payment Method', value: 'Cash on Delivery (COD)' },
  ],
  visible: true,
};

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

export const Storage = {
  getSettings(): StoreSettings {
    const settings = readJsonFile<StoreSettings>(SETTINGS_FILE, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  updateSettings(newSettings: Partial<StoreSettings>): StoreSettings {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    writeJsonFile(SETTINGS_FILE, updated);
    return updated;
  },

  getProduct(): Product {
    const product = readJsonFile<Product>(PRODUCTS_FILE, DEFAULT_PRODUCT);
    const merged = { ...DEFAULT_PRODUCT, ...product };
    // Ensure all variants have consistent stockQuantity and lowStockThreshold defaults
    merged.variants = (merged.variants || []).map((v, idx) => ({
      ...v,
      stockQuantity:
        typeof v.stockQuantity === 'number'
          ? v.stockQuantity
          : idx === 1
          ? 6
          : 18,
      lowStockThreshold:
        typeof v.lowStockThreshold === 'number' ? v.lowStockThreshold : 10,
      inStock:
        typeof v.stockQuantity === 'number'
          ? v.stockQuantity > 0
          : v.inStock ?? true,
    }));
    return merged;
  },

  updateProduct(newProduct: Partial<Product>): Product {
    const current = this.getProduct();
    const updated = { ...current, ...newProduct };
    writeJsonFile(PRODUCTS_FILE, updated);
    return updated;
  },

  // --- Coupons Management ---
  getCoupons(): Coupon[] {
    const coupons = readJsonFile<Coupon[]>(COUPONS_FILE, DEFAULT_COUPONS);
    return coupons;
  },

  getActiveCoupons(): Coupon[] {
    const coupons = this.getCoupons();
    const now = new Date();
    return coupons.filter((c) => {
      if (!c.isActive) return false;
      if (c.expiryDate) {
        const exp = new Date(c.expiryDate);
        if (exp < now) return false;
      }
      if (c.usageLimit && (c.usageCount || 0) >= c.usageLimit) return false;
      return true;
    });
  },

  getCouponByCode(code: string): Coupon | undefined {
    if (!code) return undefined;
    const cleanCode = code.trim().toUpperCase();
    const coupons = this.getCoupons();
    return coupons.find((c) => c.code.toUpperCase() === cleanCode);
  },

  validateCoupon(
    code: string,
    subtotal: number
  ): { valid: boolean; discount: number; message: string; coupon?: Coupon } {
    if (!code || typeof code !== 'string') {
      return { valid: false, discount: 0, message: 'অনুগ্রহ করে কুপন কোড প্রদান করুন।' };
    }

    const coupon = this.getCouponByCode(code);
    if (!coupon) {
      return { valid: false, discount: 0, message: 'প্রদত্ত কুপন কোডটি সঠিক নয়।' };
    }

    if (!coupon.isActive) {
      return { valid: false, discount: 0, message: 'এই কুপনটি বর্তমানে নিষ্ক্রিয় রয়েছে।' };
    }

    if (coupon.expiryDate) {
      const exp = new Date(coupon.expiryDate);
      if (exp < new Date()) {
        return { valid: false, discount: 0, message: 'এই কুপনটির মেয়াদ শেষ হয়ে গেছে।' };
      }
    }

    if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
      return { valid: false, discount: 0, message: 'এই কুপনের ব্যবহারের সর্বোচ্চ সীমা শেষ।' };
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return {
        valid: false,
        discount: 0,
        message: `এই কুপনটি ব্যবহার করতে ন্যূনতম ৳${coupon.minOrderAmount.toLocaleString()} টাকার অর্ডার প্রয়োজন।`,
      };
    }

    let discount = 0;
    if (coupon.discountType === 'fixed') {
      discount = Math.min(subtotal, coupon.discountValue);
    } else if (coupon.discountType === 'percentage') {
      const calculated = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
        discount = Math.min(subtotal, Math.min(calculated, coupon.maxDiscountAmount));
      } else {
        discount = Math.min(subtotal, calculated);
      }
    }

    discount = Math.round(discount);

    return {
      valid: true,
      discount,
      message: `কুপন '${coupon.code}' সফলভাবে প্রযোজ্য হয়েছে! আপনি ৳${discount.toLocaleString()} ছাড় পেয়েছেন।`,
      coupon,
    };
  },

  createCoupon(data: Partial<Coupon>): Coupon {
    const coupons = this.getCoupons();
    const cleanCode = (data.code || '').trim().toUpperCase();
    if (!cleanCode) throw new Error('Coupon code is required');

    if (coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
      throw new Error(`Coupon with code '${cleanCode}' already exists`);
    }

    const newCoupon: Coupon = {
      id: `coup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: cleanCode,
      discountType: data.discountType === 'percentage' ? 'percentage' : 'fixed',
      discountValue: Math.max(1, Number(data.discountValue) || 50),
      minOrderAmount: data.minOrderAmount ? Math.max(0, Number(data.minOrderAmount)) : undefined,
      maxDiscountAmount: data.maxDiscountAmount ? Math.max(0, Number(data.maxDiscountAmount)) : undefined,
      isActive: data.isActive !== undefined ? !!data.isActive : true,
      expiryDate: data.expiryDate ? data.expiryDate : undefined,
      usageCount: 0,
      usageLimit: data.usageLimit ? Math.max(1, Number(data.usageLimit)) : undefined,
      description: data.description ? data.description.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    coupons.unshift(newCoupon);
    writeJsonFile(COUPONS_FILE, coupons);
    return newCoupon;
  },

  updateCoupon(id: string, data: Partial<Coupon>): Coupon | null {
    const coupons = this.getCoupons();
    const index = coupons.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const current = coupons[index];
    const cleanCode = data.code ? data.code.trim().toUpperCase() : current.code;

    // Check code uniqueness if changing
    if (cleanCode !== current.code && coupons.some((c) => c.id !== id && c.code.toUpperCase() === cleanCode)) {
      throw new Error(`Coupon code '${cleanCode}' is already taken`);
    }

    const updated: Coupon = {
      ...current,
      ...data,
      code: cleanCode,
      discountType: data.discountType || current.discountType,
      discountValue:
        data.discountValue !== undefined
          ? Math.max(1, Number(data.discountValue))
          : current.discountValue,
      minOrderAmount:
        data.minOrderAmount !== undefined
          ? data.minOrderAmount === 0 || data.minOrderAmount === null
            ? undefined
            : Number(data.minOrderAmount)
          : current.minOrderAmount,
      maxDiscountAmount:
        data.maxDiscountAmount !== undefined
          ? data.maxDiscountAmount === 0 || data.maxDiscountAmount === null
            ? undefined
            : Number(data.maxDiscountAmount)
          : current.maxDiscountAmount,
      isActive: data.isActive !== undefined ? !!data.isActive : current.isActive,
      expiryDate: data.expiryDate !== undefined ? data.expiryDate : current.expiryDate,
      usageLimit:
        data.usageLimit !== undefined
          ? data.usageLimit === 0 || data.usageLimit === null
            ? undefined
            : Number(data.usageLimit)
          : current.usageLimit,
      description: data.description !== undefined ? data.description : current.description,
    };

    coupons[index] = updated;
    writeJsonFile(COUPONS_FILE, coupons);
    return updated;
  },

  toggleCoupon(id: string): Coupon | null {
    const coupons = this.getCoupons();
    const index = coupons.findIndex((c) => c.id === id);
    if (index === -1) return null;
    coupons[index].isActive = !coupons[index].isActive;
    writeJsonFile(COUPONS_FILE, coupons);
    return coupons[index];
  },

  deleteCoupon(id: string): boolean {
    const coupons = this.getCoupons();
    const filtered = coupons.filter((c) => c.id !== id);
    if (filtered.length === coupons.length) return false;
    writeJsonFile(COUPONS_FILE, filtered);
    return true;
  },

  incrementCouponUsage(code: string): void {
    try {
      const coupons = this.getCoupons();
      const cleanCode = code.trim().toUpperCase();
      const index = coupons.findIndex((c) => c.code.toUpperCase() === cleanCode);
      if (index !== -1) {
        coupons[index].usageCount = (coupons[index].usageCount || 0) + 1;
        writeJsonFile(COUPONS_FILE, coupons);
      }
    } catch (e) {
      console.warn('Coupon usage increment notice:', e);
    }
  },

  getOrders(): Order[] {
    return readJsonFile<Order[]>(ORDERS_FILE, []);
  },

  getOrderById(id: string): Order | undefined {
    const orders = this.getOrders();
    return orders.find((o) => o.id.toUpperCase() === id.trim().toUpperCase());
  },

  generateOrderId(): string {
    const orders = this.getOrders();
    const currentYear = new Date().getFullYear();
    const count = orders.length + 101;
    const formattedCount = String(count).padStart(5, '0');
    return `CLX-${currentYear}-${formattedCount}`;
  },

  async createOrder(data: {
    customerName: string;
    phone: string;
    fullAddress: string;
    district: string;
    deliveryArea: 'dhaka' | 'outside_dhaka';
    variantId: string;
    quantity: number;
    couponCode?: string;
    orderNote?: string;
  }): Promise<Order> {
    const settings = this.getSettings();
    const product = this.getProduct();

    const variant = product.variants.find((v) => v.id === data.variantId) || product.variants[0];
    const unitPrice = variant.price;
    const quantity = Math.max(1, Number(data.quantity) || 1);
    const subtotal = unitPrice * quantity;

    // Process coupon discount if provided
    let appliedCouponCode: string | undefined = undefined;
    let couponDiscount = 0;

    if (data.couponCode && data.couponCode.trim()) {
      const validation = this.validateCoupon(data.couponCode, subtotal);
      if (validation.valid && validation.discount > 0) {
        appliedCouponCode = validation.coupon?.code || data.couponCode.trim().toUpperCase();
        couponDiscount = validation.discount;
        this.incrementCouponUsage(appliedCouponCode);
      }
    }

    const deliveryCharge =
      data.deliveryArea === 'dhaka'
        ? settings.dhakaDeliveryCharge
        : settings.outsideDhakaDeliveryCharge;
    const totalPayable = Math.max(0, subtotal - couponDiscount) + deliveryCharge;

    const orderId = this.generateOrderId();
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: orderId,
      createdAt: now,
      customerName: data.customerName.trim(),
      phone: data.phone.trim(),
      fullAddress: data.fullAddress.trim(),
      district: data.district.trim(),
      deliveryArea: data.deliveryArea,
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      variantSize: variant.size,
      unitPrice,
      quantity,
      subtotal,
      couponCode: appliedCouponCode,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      originalSubtotal: couponDiscount > 0 ? subtotal : undefined,
      deliveryCharge,
      totalPayable,
      paymentMethod: 'COD',
      orderNote: data.orderNote ? data.orderNote.trim() : undefined,
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          timestamp: now,
          note: appliedCouponCode
            ? `Order placed by customer via Cash on Delivery (COD) with coupon '${appliedCouponCode}' (-৳${couponDiscount}).`
            : 'Order placed by customer via Cash on Delivery (COD).',
        },
      ],
      syncedToGoogleSheets: false,
    };

    const orders = this.getOrders();
    orders.unshift(newOrder);
    writeJsonFile(ORDERS_FILE, orders);

    // Decrement stock quantity for the ordered variant
    try {
      const currentProduct = this.getProduct();
      const updatedVariants = currentProduct.variants.map((v) => {
        if (v.id === variant.id && typeof v.stockQuantity === 'number') {
          const newQty = Math.max(0, v.stockQuantity - quantity);
          return {
            ...v,
            stockQuantity: newQty,
            inStock: newQty > 0,
          };
        }
        return v;
      });
      this.updateProduct({ variants: updatedVariants });
    } catch (stockErr) {
      console.warn('Inventory decrement notice:', stockErr);
    }

    // Asynchronously trigger Google Sheets Webhook if configured
    this.syncOrderToGoogleSheets(newOrder).catch((err) => {
      console.warn('Google Sheets background sync notice:', err.message);
    });

    return newOrder;
  },

  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    adminName = 'Admin'
  ): Order | null {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id.toUpperCase() === orderId.trim().toUpperCase());
    if (index === -1) return null;

    const now = new Date().toISOString();
    const order = orders[index];
    order.status = newStatus;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: newStatus,
      timestamp: now,
      note: note || `Status updated to ${newStatus}`,
      updatedBy: adminName,
    });

    orders[index] = order;
    writeJsonFile(ORDERS_FILE, orders);
    return order;
  },

  updateOrderNotes(orderId: string, adminNotes: string): Order | null {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id.toUpperCase() === orderId.trim().toUpperCase());
    if (index === -1) return null;

    orders[index].adminNotes = adminNotes;
    writeJsonFile(ORDERS_FILE, orders);
    return orders[index];
  },

  trackOrder(orderId: string, phone: string): PublicOrderTrackingResponse | null {
    const cleanId = orderId.trim().toUpperCase();
    const cleanPhone = phone.trim().replace(/\D/g, ''); // strip non-numeric

    const order = this.getOrderById(cleanId);
    if (!order) return null;

    const orderPhoneClean = order.phone.replace(/\D/g, '');
    // Compare last 10 digits to handle local 01... vs +8801...
    const match =
      orderPhoneClean === cleanPhone ||
      (orderPhoneClean.length >= 10 &&
        cleanPhone.length >= 10 &&
        orderPhoneClean.slice(-10) === cleanPhone.slice(-10));

    if (!match) return null;

    // Mask name e.g. "Farhana Rahman" -> "Far*** Rah***"
    const nameParts = order.customerName.split(' ');
    const maskedName = nameParts
      .map((part) => (part.length > 2 ? `${part.slice(0, 2)}***` : `${part}*`))
      .join(' ');

    // Mask phone e.g. "01971442479" -> "019****2479"
    let maskedPhone = order.phone;
    if (orderPhoneClean.length >= 11) {
      maskedPhone = `${orderPhoneClean.slice(0, 3)}****${orderPhoneClean.slice(-4)}`;
    }

    const settings = this.getSettings();
    const estimatedDelivery =
      order.deliveryArea === 'dhaka'
        ? settings.dhakaDeliveryTime
        : settings.outsideDhakaDeliveryTime;

    return {
      id: order.id,
      maskedCustomerName: maskedName,
      maskedPhone,
      productName: order.productName,
      variantSize: order.variantSize,
      quantity: order.quantity,
      totalPayable: order.totalPayable,
      deliveryArea: order.deliveryArea,
      status: order.status,
      statusHistory: order.statusHistory.map((h) => ({
        status: h.status,
        timestamp: h.timestamp,
        note: h.note,
      })),
      estimatedDelivery,
      createdAt: order.createdAt,
    };
  },

  getAdminStats(): AdminStats {
    const orders = this.getOrders();
    const today = new Date().toISOString().split('T')[0];

    const stats: AdminStats = {
      totalOrders: orders.length,
      totalRevenue: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      todayOrders: 0,
      todayRevenue: 0,
    };

    for (const order of orders) {
      // Calculate revenue from non-cancelled/non-returned
      if (order.status !== 'cancelled' && order.status !== 'returned') {
        stats.totalRevenue += order.totalPayable;
      }

      if (order.status === 'pending') stats.pendingOrders++;
      else if (order.status === 'confirmed') stats.confirmedOrders++;
      else if (order.status === 'processing') stats.processingOrders++;
      else if (order.status === 'shipped') stats.shippedOrders++;
      else if (order.status === 'delivered') stats.deliveredOrders++;
      else if (order.status === 'cancelled') stats.cancelledOrders++;
      else if (order.status === 'returned') stats.returnedOrders++;

      if (order.createdAt && order.createdAt.startsWith(today)) {
        stats.todayOrders++;
        if (order.status !== 'cancelled' && order.status !== 'returned') {
          stats.todayRevenue += order.totalPayable;
        }
      }
    }

    return stats;
  },

  async syncOrderToGoogleSheets(order: Order): Promise<boolean> {
    const settings = this.getSettings();
    const webhookUrl = settings.googleSheetsWebhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) return false;

    try {
      const payload = {
        event: 'NEW_ORDER',
        orderId: order.id,
        createdAt: order.createdAt,
        customerName: order.customerName,
        phone: order.phone,
        fullAddress: order.fullAddress,
        district: order.district,
        deliveryArea: order.deliveryArea,
        productName: order.productName,
        variantSize: order.variantSize,
        unitPrice: order.unitPrice,
        quantity: order.quantity,
        subtotal: order.subtotal,
        couponCode: order.couponCode || '',
        couponDiscount: order.couponDiscount || 0,
        deliveryCharge: order.deliveryCharge,
        totalPayable: order.totalPayable,
        paymentMethod: order.paymentMethod,
        orderNote: order.orderNote || '',
        status: order.status,
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        order.syncedToGoogleSheets = true;
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Google Sheets Webhook trigger error:', err);
      return false;
    }
  },
};
