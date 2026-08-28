import type {
  Product,
  StoreSettings,
  Order,
  PublicOrderTrackingResponse,
  AdminStats,
  OrderStatus,
  Coupon,
} from '../types/index.js';

const ADMIN_TOKEN_KEY = 'clixa_admin_token';

export const Api = {
  // Public Storefront APIs
  async getSettings(): Promise<StoreSettings> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load store settings');
    return res.json();
  },

  async getProducts(): Promise<Product> {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to load product details');
    return res.json();
  },

  async validateCoupon(
    code: string,
    subtotal: number
  ): Promise<{ valid: boolean; discount: number; message: string; coupon?: Coupon }> {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal }),
    });
    const json = await res.json();
    return json;
  },

  async getActiveCoupons(): Promise<Coupon[]> {
    try {
      const res = await fetch('/api/coupons/active');
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
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
  }): Promise<{ success: boolean; order: Order; message?: string }> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to place order');
    }
    return json;
  },

  async trackOrder(orderId: string, phone: string): Promise<PublicOrderTrackingResponse> {
    const res = await fetch('/api/orders/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, phone }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Order not found');
    }
    return json.tracking;
  },

  // Admin Authentication
  getAdminToken(): string | null {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setAdminToken(token: string): void {
    try {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } catch (e) {
      console.warn('Unable to persist admin token', e);
    }
  },

  removeAdminToken(): void {
    try {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch (e) {
      console.warn('Unable to clear admin token', e);
    }
  },

  adminLogout(): void {
    this.removeAdminToken();
    try {
      window.dispatchEvent(new CustomEvent('clixa:admin:logout'));
    } catch {}
  },

  async adminLogin(password: string): Promise<{ success: boolean; token: string }> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Invalid administrator password');
    }
    if (json.token) {
      this.setAdminToken(json.token);
    }
    return json;
  },

  // Helper for admin fetch with automatic 401 handling
  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAdminToken();
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.removeAdminToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('clixa:admin:unauthorized'));
      }
    }

    return response;
  },

  // Admin APIs
  async getAdminStats(): Promise<AdminStats> {
    const res = await this.fetchWithAuth('/api/admin/stats');
    if (!res.ok) throw new Error('Unauthorized or failed to load stats');
    return res.json();
  },

  async getAdminOrders(params?: {
    search?: string;
    status?: string;
    area?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
  }): Promise<{ count: number; orders: Order[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.area) query.set('area', params.area);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.sort) query.set('sort', params.sort);

    const res = await this.fetchWithAuth(`/api/admin/orders?${query.toString()}`);
    if (!res.ok) throw new Error('Unauthorized or failed to retrieve orders');
    return res.json();
  },

  async getAdminOrder(id: string): Promise<Order> {
    const res = await this.fetchWithAuth(`/api/admin/orders/${id}`);
    if (!res.ok) throw new Error('Order not found');
    return res.json();
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string,
    adminName = 'Admin'
  ): Promise<Order> {
    const res = await this.fetchWithAuth(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, note, adminName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update order status');
    return json.order;
  },

  async updateOrderNotes(orderId: string, notes: string): Promise<Order> {
    const res = await this.fetchWithAuth(`/api/admin/orders/${orderId}/notes`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update notes');
    return json.order;
  },

  async getAdminSettings(): Promise<StoreSettings> {
    const res = await this.fetchWithAuth('/api/admin/settings');
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
  },

  async updateAdminSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const res = await this.fetchWithAuth('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update settings');
    return json.settings;
  },

  async updateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    return this.updateAdminSettings(settings);
  },

  async getAdminProduct(): Promise<Product> {
    const res = await this.fetchWithAuth('/api/admin/products');
    if (!res.ok) throw new Error('Failed to load product');
    return res.json();
  },

  async updateAdminProduct(product: Partial<Product>): Promise<Product> {
    const res = await this.fetchWithAuth('/api/admin/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update product');
    return json.product;
  },

  async updateProduct(product: Partial<Product>): Promise<Product> {
    return this.updateAdminProduct(product);
  },

  // Admin Coupon Management APIs
  async getAdminCoupons(): Promise<{ coupons: Coupon[] }> {
    const res = await this.fetchWithAuth('/api/admin/coupons');
    if (!res.ok) throw new Error('Unauthorized or failed to retrieve coupons');
    return res.json();
  },

  async createAdminCoupon(coupon: Partial<Coupon>): Promise<{ success: boolean; coupon: Coupon }> {
    const res = await this.fetchWithAuth('/api/admin/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(coupon),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create coupon');
    return json;
  },

  async updateAdminCoupon(
    id: string,
    coupon: Partial<Coupon>
  ): Promise<{ success: boolean; coupon: Coupon }> {
    const res = await this.fetchWithAuth(`/api/admin/coupons/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(coupon),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update coupon');
    return json;
  },

  async toggleAdminCoupon(id: string): Promise<{ success: boolean; coupon: Coupon }> {
    const res = await this.fetchWithAuth(`/api/admin/coupons/${id}/toggle`, {
      method: 'PATCH',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to toggle coupon status');
    return json;
  },

  async deleteAdminCoupon(id: string): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithAuth(`/api/admin/coupons/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete coupon');
    return json;
  },

  async testGoogleSheetsWebhook(webhookUrl?: string): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithAuth('/api/admin/google-sheets/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ webhookUrl }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Webhook test failed');
    return json;
  },
};
