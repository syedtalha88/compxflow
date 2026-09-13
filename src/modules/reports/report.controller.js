import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import Invoice from '../../models/Invoice.js';
import Payment from '../../models/Payment.js';
import Purchase from '../../models/Purchase.js';
import PurchasePayment from '../../models/PurchasePayment.js';
import Expense from '../../models/Expense.js';
import ApiError from '../../utils/apiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * Helper to get UTC start and end of a given date YYYY-MM-DD
 */
const getDateRange = (dateStr) => {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(targetDate.getTime())) {
    throw new ApiError(400, 'INVALID_DATE', 'Invalid date format provided. Use YYYY-MM-DD.');
  }

  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);

  const formattedDate = start.toISOString().split('T')[0];
  return { start, end, formattedDate };
};

/**
 * Helper to perform aggregations in MongoDB instead of Node memory
 */
const getAggregationTotals = async (tenantId, start, end) => {
  const matchCreated = { $match: { tenantId, createdAt: { $gte: start, $lte: end } } };
  const matchCaptured = { $match: { tenantId, capturedAt: { $gte: start, $lte: end } } };
  const matchDate = { $match: { tenantId, date: { $gte: start, $lte: end } } };

  const [invAgg, payAgg, purAgg, purPayAgg, expAgg] = await Promise.all([
    Invoice.aggregate([matchCreated, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    Payment.aggregate([matchCaptured, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Purchase.aggregate([matchCreated, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    PurchasePayment.aggregate([matchCaptured, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Expense.aggregate([matchDate, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }])
  ]);

  const totalInvoiced = invAgg[0]?.total || 0;
  const totalSalesReceived = payAgg[0]?.total || 0;
  const totalPurchasesSpend = purAgg[0]?.total || 0;
  const totalPurchasePaid = purPayAgg[0]?.total || 0;
  const totalExpenses = expAgg[0]?.total || 0;

  return {
    summary: {
      totalInvoiced,
      totalSalesReceived,
      totalPurchasesSpend,
      totalPurchasePaid,
      totalExpenses,
      netPosition: totalSalesReceived - (totalPurchasePaid + totalExpenses)
    },
    counts: {
      invoices: invAgg[0]?.count || 0,
      salesPayments: payAgg[0]?.count || 0,
      purchases: purAgg[0]?.count || 0,
      purchasePayments: purPayAgg[0]?.count || 0,
      expenses: expAgg[0]?.count || 0
    }
  };
};

/**
 * GET /api/reports/day?date=YYYY-MM-DD
 */
export const getDayReport = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { date } = req.query;
  const { start, end, formattedDate } = getDateRange(date);

  const { summary, counts } = await getAggregationTotals(tenantId, start, end);

  const invoices = await Invoice.find({ tenantId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).limit(100).lean();
  const salesPayments = await Payment.find({ tenantId, capturedAt: { $gte: start, $lte: end } }).populate('invoiceId', 'billNo customerName').sort({ capturedAt: -1 }).limit(100).lean();
  const purchases = await Purchase.find({ tenantId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).limit(100).lean();
  const purchasePayments = await PurchasePayment.find({ tenantId, capturedAt: { $gte: start, $lte: end } }).populate('purchaseId', 'billNo supplierName').sort({ capturedAt: -1 }).limit(100).lean();
  const expenses = await Expense.find({ tenantId, date: { $gte: start, $lte: end } }).sort({ date: -1 }).limit(100).lean();

  return successResponse(res, 200, {
    date: formattedDate,
    summary: {
      totalInvoiced: summary.totalInvoiced,
      totalSalesReceivedOnDate: summary.totalSalesReceived,
      totalPurchasesSpend: summary.totalPurchasesSpend,
      totalPurchasePaidOnDate: summary.totalPurchasePaid,
      totalExpenses: summary.totalExpenses,
      netPosition: summary.netPosition
    },
    counts,
    itemized: { invoices, salesPayments, purchases, purchasePayments, expenses }
  }, `Daily financial report generated for ${formattedDate}`);
});

/**
 * GET /api/reports/month?month=YYYY-MM
 */
export const getMonthReport = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { month } = req.query;

  let year, monthIdx;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const parts = month.split('-');
    year = parseInt(parts[0]);
    monthIdx = parseInt(parts[1]) - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIdx = now.getMonth();
  }

  const startOfMonth = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
  const formattedMonth = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

  const { summary, counts } = await getAggregationTotals(tenantId, startOfMonth, endOfMonth);

  // Daily breakdown aggregations
  const matchCreated = { $match: { tenantId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } } };
  const matchCaptured = { $match: { tenantId, capturedAt: { $gte: startOfMonth, $lte: endOfMonth } } };
  const matchDate = { $match: { tenantId, date: { $gte: startOfMonth, $lte: endOfMonth } } };

  const [invDays, payDays, purDays, purPayDays, expDays] = await Promise.all([
    Invoice.aggregate([matchCreated, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, total: { $sum: "$totalAmount" } } }]),
    Payment.aggregate([matchCaptured, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$capturedAt", timezone: "UTC" } }, total: { $sum: "$amount" } } }]),
    Purchase.aggregate([matchCreated, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, total: { $sum: "$totalAmount" } } }]),
    PurchasePayment.aggregate([matchCaptured, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$capturedAt", timezone: "UTC" } }, total: { $sum: "$amount" } } }]),
    Expense.aggregate([matchDate, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "UTC" } }, total: { $sum: "$amount" } } }])
  ]);

  const daysInMonth = endOfMonth.getDate();
  const dailyBreakdownMap = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${formattedMonth}-${String(day).padStart(2, '0')}`;
    dailyBreakdownMap[dayStr] = { date: dayStr, invoiced: 0, received: 0, spend: 0, paid: 0, expenses: 0, net: 0 };
  }

  invDays.forEach(d => { if (dailyBreakdownMap[d._id]) dailyBreakdownMap[d._id].invoiced = d.total; });
  payDays.forEach(d => { if (dailyBreakdownMap[d._id]) dailyBreakdownMap[d._id].received = d.total; });
  purDays.forEach(d => { if (dailyBreakdownMap[d._id]) dailyBreakdownMap[d._id].spend = d.total; });
  purPayDays.forEach(d => { if (dailyBreakdownMap[d._id]) dailyBreakdownMap[d._id].paid = d.total; });
  expDays.forEach(d => { if (dailyBreakdownMap[d._id]) dailyBreakdownMap[d._id].expenses = d.total; });

  const dailyBreakdown = Object.values(dailyBreakdownMap).map(item => ({
    ...item,
    net: item.received - (item.paid + item.expenses)
  }));

  const invoices = await Invoice.find({ tenantId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }).sort({ createdAt: -1 }).limit(100).lean();
  const salesPayments = await Payment.find({ tenantId, capturedAt: { $gte: startOfMonth, $lte: endOfMonth } }).populate('invoiceId', 'billNo customerName').sort({ capturedAt: -1 }).limit(100).lean();
  const purchases = await Purchase.find({ tenantId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }).sort({ createdAt: -1 }).limit(100).lean();
  const purchasePayments = await PurchasePayment.find({ tenantId, capturedAt: { $gte: startOfMonth, $lte: endOfMonth } }).populate('purchaseId', 'billNo supplierName').sort({ capturedAt: -1 }).limit(100).lean();
  const expenses = await Expense.find({ tenantId, date: { $gte: startOfMonth, $lte: endOfMonth } }).sort({ date: -1 }).limit(100).lean();

  return successResponse(res, 200, {
    month: formattedMonth,
    summary,
    counts,
    dailyBreakdown,
    itemized: { invoices, salesPayments, purchases, purchasePayments, expenses }
  }, `Monthly report generated for ${formattedMonth}`);
});

/**
 * GET /api/reports/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getRangeReport = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(400, 'INVALID_DATE_RANGE', 'Invalid startDate or endDate provided');
  }

  const { summary, counts } = await getAggregationTotals(tenantId, start, end);

  const invoices = await Invoice.find({ tenantId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).limit(100).lean();
  const salesPayments = await Payment.find({ tenantId, capturedAt: { $gte: start, $lte: end } }).populate('invoiceId', 'billNo customerName').sort({ capturedAt: -1 }).limit(100).lean();
  const purchases = await Purchase.find({ tenantId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).limit(100).lean();
  const purchasePayments = await PurchasePayment.find({ tenantId, capturedAt: { $gte: start, $lte: end } }).populate('purchaseId', 'billNo supplierName').sort({ capturedAt: -1 }).limit(100).lean();
  const expenses = await Expense.find({ tenantId, date: { $gte: start, $lte: end } }).sort({ date: -1 }).limit(100).lean();

  return successResponse(res, 200, {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    summary,
    counts,
    itemized: { invoices, salesPayments, purchases, purchasePayments, expenses }
  }, 'Date range report generated');
});

/**
 * GET /api/reports/export/pdf?startDate=...&endDate=...
 */
export const exportPdfReport = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const tenantName = req.tenant.name || 'Factory Workspace';
  const { startDate, endDate, date, month } = req.query;

  let start, end;
  if (date) {
    const range = getDateRange(date);
    start = range.start;
    end = range.end;
  } else if (month && /^\d{4}-\d{2}$/.test(month)) {
    const parts = month.split('-');
    const year = parseInt(parts[0]);
    const monthIdx = parseInt(parts[1]) - 1;
    start = new Date(year, monthIdx, 1, 0, 0, 0, 0);
    end = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
  } else {
    start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
  }

  const { summary } = await getAggregationTotals(tenantId, start, end);

  // PDF only uses first 20 items for preview
  const invoices = await Invoice.find({ tenantId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).limit(20).lean();
  const purchases = await Purchase.find({ tenantId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).limit(20).lean();
  const expenses = await Expense.find({ tenantId, date: { $gte: start, $lte: end } }).sort({ date: -1 }).limit(20).lean();

  const doc = new PDFDocument({ margin: 40 });
  const filename = `CompXFlow_Report_${start.toISOString().split('T')[0]}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Document Header
  doc.fontSize(22).fillColor('#4338CA').text('COMPXFLOW FINANCIAL REPORT', { align: 'center' });
  doc.fontSize(12).fillColor('#374151').text(`Tenant: ${tenantName}`, { align: 'center' });
  doc.fontSize(10).fillColor('#6B7280').text(`Period: ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`, { align: 'center' });
  doc.moveDown(1.5);

  // Financial Summary Table
  doc.fontSize(14).fillColor('#1F2937').text('FINANCIAL KPI SUMMARY', { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor('#1F2937');
  doc.text(`Total Sales Invoiced:  INR ${summary.totalInvoiced.toLocaleString('en-IN')}`);
  doc.text(`Total Sales Cash Received:  INR ${summary.totalSalesReceived.toLocaleString('en-IN')}`);
  doc.text(`Total Supplier Purchases:  INR ${summary.totalPurchasesSpend.toLocaleString('en-IN')}`);
  doc.text(`Total Supplier Payments Settled: INR ${summary.totalPurchasePaid.toLocaleString('en-IN')}`);
  doc.text(`Total Factory Overhead Expenses: INR ${summary.totalExpenses.toLocaleString('en-IN')}`);
  doc.fontSize(11).fillColor('#4338CA').text(`NET CASH POSITION:  INR ${summary.netPosition.toLocaleString('en-IN')}`, { bold: true });
  doc.moveDown(1.5);

  // Itemized Sales Invoices
  doc.fontSize(12).fillColor('#1F2937').text(`1. Sales Invoices Created (${invoices.length})`, { underline: true });
  doc.moveDown(0.5);
  invoices.forEach((inv, idx) => {
    doc.fontSize(9).fillColor('#374151').text(`${idx + 1}. Bill #${inv.billNo} | Customer: ${inv.customerName} | Total: INR ${inv.totalAmount.toLocaleString('en-IN')} | Pending: INR ${(inv.amountPending || 0).toLocaleString('en-IN')} | Status: ${inv.status}`);
  });
  if (invoices.length === 0) doc.fontSize(9).fillColor('#9CA3AF').text('No sales invoices created in this period.');
  doc.moveDown(1.5);

  // Itemized Supplier Purchases
  doc.fontSize(12).fillColor('#1F2937').text(`2. Supplier Purchases (${purchases.length})`, { underline: true });
  doc.moveDown(0.5);
  purchases.forEach((pur, idx) => {
    doc.fontSize(9).fillColor('#374151').text(`${idx + 1}. Purchase #${pur.billNo} | Supplier: ${pur.supplierName} | Total: INR ${pur.totalAmount.toLocaleString('en-IN')} | Pending: INR ${(pur.amountPending || 0).toLocaleString('en-IN')}`);
  });
  if (purchases.length === 0) doc.fontSize(9).fillColor('#9CA3AF').text('No purchase bills created in this period.');
  doc.moveDown(1.5);

  // Itemized Expenses
  doc.fontSize(12).fillColor('#1F2937').text(`3. Factory Expenses (${expenses.length})`, { underline: true });
  doc.moveDown(0.5);
  expenses.forEach((exp, idx) => {
    doc.fontSize(9).fillColor('#374151').text(`${idx + 1}. Category: ${exp.category.toUpperCase()} | Amount: INR ${exp.amount.toLocaleString('en-IN')} | Description: ${exp.description || 'N/A'}`);
  });
  if (expenses.length === 0) doc.fontSize(9).fillColor('#9CA3AF').text('No expenses recorded in this period.');

  doc.end();
});

/**
 * GET /api/reports/export/excel?startDate=...&endDate=...
 */
export const exportExcelReport = asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;
  const { startDate, endDate, date, month } = req.query;

  let start, end;
  if (date) {
    const range = getDateRange(date);
    start = range.start;
    end = range.end;
  } else if (month && /^\d{4}-\d{2}$/.test(month)) {
    const parts = month.split('-');
    const year = parseInt(parts[0]);
    const monthIdx = parseInt(parts[1]) - 1;
    start = new Date(year, monthIdx, 1, 0, 0, 0, 0);
    end = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
  } else {
    start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
  }

  const { summary } = await getAggregationTotals(tenantId, start, end);

  // Using lean() to prevent full mongoose document instantiation to save memory
  const invoices = await Invoice.find({ tenantId, createdAt: { $gte: start, $lte: end } }).lean();
  const salesPayments = await Payment.find({ tenantId, capturedAt: { $gte: start, $lte: end } }).populate('invoiceId', 'billNo customerName').lean();
  const purchases = await Purchase.find({ tenantId, createdAt: { $gte: start, $lte: end } }).lean();
  const purchasePayments = await PurchasePayment.find({ tenantId, capturedAt: { $gte: start, $lte: end } }).populate('purchaseId', 'billNo supplierName').lean();
  const expenses = await Expense.find({ tenantId, date: { $gte: start, $lte: end } }).lean();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CompXFlow SaaS System';

  // Sheet 1: Financial Summary
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Financial Metric', key: 'metric', width: 32 },
    { header: 'Amount (INR)', key: 'amount', width: 22 }
  ];

  summarySheet.addRows([
    { metric: 'Total Sales Invoiced', amount: summary.totalInvoiced },
    { metric: 'Total Sales Cash Received', amount: summary.totalSalesReceived },
    { metric: 'Total Supplier Purchases Spend', amount: summary.totalPurchasesSpend },
    { metric: 'Total Supplier Payments Settled', amount: summary.totalPurchasePaid },
    { metric: 'Total Factory Expenses', amount: summary.totalExpenses },
    { metric: 'NET CASH POSITION', amount: summary.netPosition }
  ]);

  // Sheet 2: Sales Invoices
  const invSheet = workbook.addWorksheet('Sales Invoices');
  invSheet.columns = [
    { header: 'Bill No', key: 'billNo', width: 16 },
    { header: 'Customer Name', key: 'customerName', width: 25 },
    { header: 'Total Amount (INR)', key: 'totalAmount', width: 20 },
    { header: 'Amount Received', key: 'amountReceived', width: 20 },
    { header: 'Amount Pending', key: 'amountPending', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Created Date', key: 'createdAt', width: 20 }
  ];
  invoices.forEach(inv => invSheet.addRow({
    billNo: inv.billNo,
    customerName: inv.customerName,
    totalAmount: inv.totalAmount,
    amountReceived: inv.amountReceived,
    amountPending: inv.amountPending,
    status: inv.status,
    createdAt: inv.createdAt.toISOString().split('T')[0]
  }));

  // Sheet 3: Sales Payments Receipts
  const paySheet = workbook.addWorksheet('Sales Payments');
  paySheet.columns = [
    { header: 'Invoice Bill No', key: 'billNo', width: 16 },
    { header: 'Customer Name', key: 'customerName', width: 25 },
    { header: 'Payment Amount (INR)', key: 'amount', width: 20 },
    { header: 'Receipt Image URL', key: 'receiptUrl', width: 40 },
    { header: 'Payment Date', key: 'capturedAt', width: 20 }
  ];
  salesPayments.forEach(p => paySheet.addRow({
    billNo: p.invoiceId?.billNo || 'N/A',
    customerName: p.invoiceId?.customerName || 'N/A',
    amount: p.amount,
    receiptUrl: p.receiptImageUrl || '',
    capturedAt: p.capturedAt.toISOString().split('T')[0]
  }));

  // Sheet 4: Supplier Purchases
  const purSheet = workbook.addWorksheet('Purchases');
  purSheet.columns = [
    { header: 'Purchase Bill No', key: 'billNo', width: 18 },
    { header: 'Supplier Name', key: 'supplierName', width: 25 },
    { header: 'Total Amount (INR)', key: 'totalAmount', width: 20 },
    { header: 'Amount Paid', key: 'amountPaid', width: 20 },
    { header: 'Amount Pending', key: 'amountPending', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Created Date', key: 'createdAt', width: 20 }
  ];
  purchases.forEach(pur => purSheet.addRow({
    billNo: pur.billNo,
    supplierName: pur.supplierName,
    totalAmount: pur.totalAmount,
    amountPaid: pur.amountPaid,
    amountPending: pur.amountPending,
    status: pur.status,
    createdAt: pur.createdAt.toISOString().split('T')[0]
  }));

  // Sheet 5: Expenses
  const expSheet = workbook.addWorksheet('Expenses');
  expSheet.columns = [
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Amount (INR)', key: 'amount', width: 18 },
    { header: 'Description', key: 'description', width: 35 },
    { header: 'Expense Date', key: 'date', width: 16 },
    { header: 'Receipt Photo URL', key: 'imageUrl', width: 40 }
  ];
  expenses.forEach(exp => expSheet.addRow({
    category: exp.category,
    amount: exp.amount,
    description: exp.description,
    date: exp.date.toISOString().split('T')[0],
    imageUrl: exp.imageUrl || ''
  }));

  const filename = `CompXFlow_Report_${start.toISOString().split('T')[0]}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
});

export default {
  getDayReport,
  getMonthReport,
  getRangeReport,
  exportPdfReport,
  exportExcelReport
};
