import * as XLSX from 'xlsx';
import type { Order } from '../types/index.js';

export function formatOrdersForExport(orders: Order[]) {
  return orders.map((o) => ({
    'Order ID': o.id,
    'Order Date': new Date(o.createdAt).toLocaleString('en-GB'),
    'Customer Name': o.customerName,
    'Phone Number': o.phone,
    'Full Address': o.fullAddress,
    District: o.district,
    'Delivery Area': o.deliveryArea === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
    Product: o.productName,
    Variant: o.variantName,
    Size: o.variantSize,
    Quantity: o.quantity,
    'Unit Price (BDT)': o.unitPrice,
    'Subtotal (BDT)': o.subtotal,
    'Delivery Charge (BDT)': o.deliveryCharge,
    'Total Payable (BDT)': o.totalPayable,
    'Payment Method': o.paymentMethod,
    Status: o.status.toUpperCase(),
    'Customer Note': o.orderNote || '',
    'Admin Notes': o.adminNotes || '',
  }));
}

export function exportOrdersToCSV(orders: Order[], filename = 'CLIXA_Orders.csv') {
  const formatted = formatOrdersForExport(orders);
  if (formatted.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportOrdersToExcel(orders: Order[], filename = 'CLIXA_Orders.xlsx') {
  const formatted = formatOrdersForExport(orders);
  if (formatted.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(formatted);

  // Auto-fit column widths
  const colWidths = Object.keys(formatted[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...formatted.map((row) => String((row as any)[key] || '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
  XLSX.writeFile(workbook, filename);
}
