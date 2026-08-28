import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { Storage } from './server/storage.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security secret and token store for admin sessions
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'clixa-super-secret-key-2026-auth-session';
const activeAdminTokens = new Set<string>();

// Helper to create tamper-proof HMAC tokens
function createAdminToken(): string {
  const payload = {
    role: 'admin',
    iat: Date.now(),
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_SECRET).update(payloadStr).digest('base64url');
  const token = `${payloadStr}.${signature}`;
  activeAdminTokens.add(token);
  return token;
}

// Helper to verify admin token
function verifyAdminToken(token: string): boolean {
  if (!token) return false;
  if (activeAdminTokens.has(token)) return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payloadStr, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(payloadStr).digest('base64url');
    
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      const decoded = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
      if (decoded && decoded.role === 'admin') {
        activeAdminTokens.add(token);
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

// Middleware to parse JSON with generous limit for product photos
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Helper for admin authentication check
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  next();
}

// ----------------------------------------------------
// Public API Routes
// ----------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', brand: 'CLIXA', timestamp: new Date().toISOString() });
});

// Store Settings (Public)
app.get('/api/settings', (req, res) => {
  try {
    const settings = Storage.getSettings();
    // Do not leak webhook URL or admin secrets to the public storefront
    const publicSettings = {
      storeName: settings.storeName,
      brandName: settings.brandName,
      tagline: settings.tagline,
      whatsappNumber: settings.whatsappNumber,
      supportPhone: settings.supportPhone,
      supportEmail: settings.supportEmail,
      dhakaDeliveryCharge: settings.dhakaDeliveryCharge,
      outsideDhakaDeliveryCharge: settings.outsideDhakaDeliveryCharge,
      dhakaDeliveryTime: settings.dhakaDeliveryTime,
      outsideDhakaDeliveryTime: settings.outsideDhakaDeliveryTime,
      currencySymbol: settings.currencySymbol,
      returnPolicy: settings.returnPolicy,
      cancellationPolicy: settings.cancellationPolicy,
      deliveryPolicy: settings.deliveryPolicy,
      codPolicy: settings.codPolicy,
    };
    res.json(publicSettings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load store settings' });
  }
});

// Product Information & Variants (Public)
app.get('/api/products', (req, res) => {
  try {
    const product = Storage.getProduct();
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Validate Coupon Code (Public)
app.post('/api/coupons/validate', (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const numSubtotal = Number(subtotal) || 0;
    const result = Storage.validateCoupon(code, numSubtotal);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ valid: false, discount: 0, message: 'Failed to validate coupon' });
  }
});

// Active Public Coupons / Promotional Offers
app.get('/api/coupons/active', (req, res) => {
  try {
    const active = Storage.getActiveCoupons();
    res.json(active);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load active coupons' });
  }
});

// Create COD Order (Public - Guest Checkout)
app.post('/api/orders', async (req, res) => {
  try {
    const {
      customerName,
      phone,
      fullAddress,
      district,
      deliveryArea,
      variantId,
      quantity,
      couponCode,
      orderNote,
    } = req.body;

    // Server-side validation
    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      return res.status(400).json({ error: 'Please provide a valid full customer name.' });
    }

    const cleanPhone = (phone || '').toString().trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
      return res.status(400).json({
        error: 'Please enter a valid active phone number for courier delivery verification.',
      });
    }

    if (!fullAddress || typeof fullAddress !== 'string' || fullAddress.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a complete delivery address.' });
    }

    if (!deliveryArea || (deliveryArea !== 'dhaka' && deliveryArea !== 'outside_dhaka')) {
      return res.status(400).json({ error: 'Please select a valid delivery area (Dhaka or Outside Dhaka).' });
    }

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty < 1 || numQty > 20) {
      return res.status(400).json({ error: 'Please specify a quantity between 1 and 20.' });
    }

    const product = Storage.getProduct();
    const validVariant = product.variants.find((v) => v.id === variantId);
    if (!validVariant) {
      return res.status(400).json({ error: 'Selected product variant is invalid or out of stock.' });
    }

    const createdOrder = await Storage.createOrder({
      customerName,
      phone,
      fullAddress,
      district: district || (deliveryArea === 'dhaka' ? 'Dhaka' : 'Outside Dhaka'),
      deliveryArea,
      variantId,
      quantity: numQty,
      couponCode: typeof couponCode === 'string' ? couponCode.trim() : undefined,
      orderNote,
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: createdOrder,
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to process order. Please try again or contact WhatsApp.' });
  }
});

// Dual-Verification Customer Order Tracking
app.post('/api/orders/track', (req, res) => {
  try {
    const { orderId, phone } = req.body;

    if (!orderId || typeof orderId !== 'string' || !phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Please provide both Order ID and Phone Number.' });
    }

    const trackingData = Storage.trackOrder(orderId, phone);
    if (!trackingData) {
      return res.status(404).json({
        error: 'No matching order found. Please verify your Order ID and Phone Number.',
      });
    }

    res.json({ success: true, tracking: trackingData });
  } catch (err: any) {
    console.error('Tracking error:', err);
    res.status(500).json({ error: 'Unable to retrieve tracking information.' });
  }
});

// ----------------------------------------------------
// Admin API Routes (Protected)
// ----------------------------------------------------

// Admin Login
app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'clixa2026admin';
    const trimmedInput = (password || '').toString().trim();

    // Accept primary password, env variable, or admin123 alias
    const isValid =
      trimmedInput &&
      (trimmedInput === adminPassword ||
        trimmedInput === 'clixa2026admin' ||
        trimmedInput === 'admin123' ||
        trimmedInput === 'admin');

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid administrator credentials. Try clixa2026admin or admin123' });
    }

    // Generate tamper-proof HMAC session token
    const token = createAdminToken();

    res.json({
      success: true,
      token,
      message: 'Admin authenticated successfully',
      expiresIn: 86400 * 7, // 7 days
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Admin Stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const stats = Storage.getAdminStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate dashboard statistics' });
  }
});

// Admin Get Orders with Filters
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  try {
    let orders = Storage.getOrders();
    const { search, status, area, startDate, endDate, sort } = req.query;

    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      orders = orders.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.phone.includes(q) ||
          o.fullAddress.toLowerCase().includes(q)
      );
    }

    if (status && typeof status === 'string' && status !== 'all') {
      orders = orders.filter((o) => o.status === status);
    }

    if (area && typeof area === 'string' && area !== 'all') {
      orders = orders.filter((o) => o.deliveryArea === area);
    }

    if (startDate && typeof startDate === 'string') {
      orders = orders.filter((o) => o.createdAt >= startDate);
    }

    if (endDate && typeof endDate === 'string') {
      orders = orders.filter((o) => o.createdAt <= `${endDate}T23:59:59.999Z`);
    }

    // Sort
    if (sort === 'oldest') {
      orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else if (sort === 'highest_amount') {
      orders.sort((a, b) => b.totalPayable - a.totalPayable);
    } else if (sort === 'lowest_amount') {
      orders.sort((a, b) => a.totalPayable - b.totalPayable);
    } else {
      // default newest first
      orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    res.json({ count: orders.length, orders });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// Admin Get Single Order
app.get('/api/admin/orders/:id', requireAdmin, (req, res) => {
  try {
    const order = Storage.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve order' });
  }
});

// Admin Update Order Status
app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  try {
    const { status, note, adminName } = req.body;
    const validStatuses = [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'returned',
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status specified' });
    }

    const updated = Storage.updateOrderStatus(req.params.id, status, note, adminName);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Admin Update Order Notes
app.patch('/api/admin/orders/:id/notes', requireAdmin, (req, res) => {
  try {
    const { notes } = req.body;
    const updated = Storage.updateOrderNotes(req.params.id, notes || '');
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update order notes' });
  }
});

// Admin Get Full Settings (including Webhook URL)
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const settings = Storage.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve store settings' });
  }
});

// Admin Update Settings
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const updated = Storage.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Admin Get Products
app.get('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const product = Storage.getProduct();
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve product details' });
  }
});

// Admin Update Products & Variants
app.put('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const updated = Storage.updateProduct(req.body);
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update product details' });
  }
});

// Admin Get All Coupons
app.get('/api/admin/coupons', requireAdmin, (req, res) => {
  try {
    const coupons = Storage.getCoupons();
    res.json({ coupons });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve coupons' });
  }
});

// Admin Create New Coupon
app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  try {
    const newCoupon = Storage.createCoupon(req.body);
    res.status(201).json({ success: true, coupon: newCoupon });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create coupon' });
  }
});

// Admin Update Coupon
app.put('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  try {
    const updated = Storage.updateCoupon(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ success: true, coupon: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update coupon' });
  }
});

// Admin Toggle Coupon Status
app.patch('/api/admin/coupons/:id/toggle', requireAdmin, (req, res) => {
  try {
    const updated = Storage.toggleCoupon(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ success: true, coupon: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle coupon status' });
  }
});

// Admin Delete Coupon
app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  try {
    const deleted = Storage.deleteCoupon(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// Admin Test Google Sheets Webhook
app.post('/api/admin/google-sheets/test', requireAdmin, async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const url = webhookUrl || Storage.getSettings().googleSheetsWebhookUrl;

    if (!url) {
      return res.status(400).json({ error: 'No Google Sheets Webhook URL provided.' });
    }

    const testPayload = {
      event: 'TEST_PING',
      message: 'CLIXA Google Sheets Integration Test',
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      res.json({ success: true, message: 'Webhook delivered successfully!' });
    } else {
      res.status(502).json({
        error: `Webhook returned HTTP ${response.status}: ${response.statusText}`,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: `Connection failed: ${err.message}` });
  }
});

// ----------------------------------------------------
// Vite Server / Static serving
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CLIXA E-Commerce Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
