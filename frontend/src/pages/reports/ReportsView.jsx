import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import {
  fetchDayReport,
  fetchMonthReport,
  fetchRangeReport,
  downloadReportPdf,
  downloadReportExcel
} from '../../api/index.js';

export function ReportsView({ slug: propSlug }) {
  const { isAdmin } = useAuth();
  const { tenantSlug: contextSlug } = useTenant();
  const activeSlug = propSlug || contextSlug || 'kaleem';

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // 'YYYY-MM'

  const [dateMode, setDateMode] = useState('day'); // 'day' | 'month' | 'range'
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [itemizedTab, setItemizedTab] = useState('invoices');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const loadReport = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let res;
      if (dateMode === 'day') {
        res = await fetchDayReport(selectedDate, activeSlug);
      } else if (dateMode === 'month') {
        res = await fetchMonthReport(selectedMonth, activeSlug);
      } else {
        res = await fetchRangeReport(startDate, endDate, activeSlug);
      }

      if (res && res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [dateMode, selectedDate, selectedMonth, startDate, endDate, activeSlug]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const exportOptions = dateMode === 'day'
        ? { date: selectedDate }
        : dateMode === 'month'
        ? { month: selectedMonth }
        : { startDate, endDate };

      await downloadReportPdf({ ...exportOptions, slug: activeSlug });
    } catch (err) {
      alert('Failed to download PDF report');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const exportOptions = dateMode === 'day'
        ? { date: selectedDate }
        : dateMode === 'month'
        ? { month: selectedMonth }
        : { startDate, endDate };

      await downloadReportExcel({ ...exportOptions, slug: activeSlug });
    } catch (err) {
      alert('Failed to download Excel sheet');
    } finally {
      setDownloading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl text-center space-y-3 font-sans max-w-md mx-auto my-12">
        <div className="text-4xl">🚫</div>
        <h2 className="text-lg font-black text-rose-900">Access Restricted</h2>
        <p className="text-xs text-rose-700 font-medium">
          Financial reports and cash flow audits are restricted to Admin users only.
        </p>
      </div>
    );
  }

  // Safe Property Extraction
  const totalInvoiced = reportData?.summary?.totalInvoiced || 0;
  const totalSalesReceived = reportData?.summary?.totalSalesReceivedOnDate ?? reportData?.summary?.totalSalesReceived ?? 0;
  const totalPurchasesSpend = reportData?.summary?.totalPurchasesSpend || 0;
  const totalPurchasePaid = reportData?.summary?.totalPurchasePaidOnDate ?? reportData?.summary?.totalPurchasePaid ?? 0;
  const totalExpenses = reportData?.summary?.totalExpenses || 0;
  const netPosition = reportData?.summary?.netPosition || 0;

  const itemized = {
    invoices: reportData?.itemized?.invoices || [],
    salesPayments: reportData?.itemized?.salesPayments || [],
    purchases: reportData?.itemized?.purchases || [],
    purchasePayments: reportData?.itemized?.purchasePayments || [],
    expenses: reportData?.itemized?.expenses || []
  };

  const dailyBreakdown = reportData?.dailyBreakdown || [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-sans pb-32">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-card p-5 md:p-6 rounded-[10px] border border-neutral-border shadow-level-1">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-brand-primary uppercase tracking-wider mb-0.5">Financial Audit & Accounting</span>
          <h1 className="text-[20px] md:text-[24px] font-bold text-neutral-primary tracking-tight">Reports Dashboard</h1>
          <p className="text-[13px] text-neutral-tertiary font-medium mt-0.5">End-to-end sales, supplier spend, expenses, and net cash flow position</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="w-full sm:w-auto py-2 px-4 bg-neutral-bg border border-neutral-border hover:bg-neutral-divider text-neutral-primary text-[13px] font-semibold rounded-[8px] shadow-level-1 transition flex items-center justify-center gap-2 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-[16px] h-[16px] text-rose-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            {downloading ? 'Downloading...' : 'Export PDF'}
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="w-full sm:w-auto py-2 px-4 bg-neutral-bg border border-neutral-border hover:bg-neutral-divider text-neutral-primary text-[13px] font-semibold rounded-[8px] shadow-level-1 transition flex items-center justify-center gap-2 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-[16px] h-[16px] text-emerald-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            {downloading ? 'Downloading...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Date Filter & Selector Bar */}
      <div className="bg-neutral-card p-4 rounded-[10px] border border-neutral-border shadow-level-1 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-neutral-bg p-1 rounded-[8px] text-[13px] font-semibold w-full md:w-auto border border-neutral-divider">
          <button
            onClick={() => setDateMode('day')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-[6px] transition ${dateMode === 'day' ? 'bg-brand-primary text-white shadow-level-1' : 'text-neutral-secondary hover:text-neutral-primary'}`}
          >
            Daily View
          </button>
          <button
            onClick={() => setDateMode('month')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-[6px] transition ${dateMode === 'month' ? 'bg-brand-primary text-white shadow-level-1' : 'text-neutral-secondary hover:text-neutral-primary'}`}
          >
            Monthly 📅
          </button>
          <button
            onClick={() => setDateMode('range')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-[6px] transition ${dateMode === 'range' ? 'bg-brand-primary text-white shadow-level-1' : 'text-neutral-secondary hover:text-neutral-primary'}`}
          >
            Range 🗓️
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto text-[13px]">
          {dateMode === 'day' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 font-medium rounded-[6px] border border-neutral-border bg-neutral-bg focus:border-brand-primary focus:outline-none text-neutral-primary"
            />
          )}

          {dateMode === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 font-medium rounded-[6px] border border-neutral-border bg-neutral-bg focus:border-brand-primary focus:outline-none text-neutral-primary"
            />
          )}

          {dateMode === 'range' && (
            <div className="flex items-center gap-2 font-medium text-neutral-secondary">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 font-medium rounded-[6px] border border-neutral-border bg-neutral-bg focus:border-brand-primary focus:outline-none text-neutral-primary"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 font-medium rounded-[6px] border border-neutral-border bg-neutral-bg focus:border-brand-primary focus:outline-none text-neutral-primary"
              />
            </div>
          )}

          <button
            onClick={loadReport}
            className="py-1.5 px-3 bg-neutral-bg hover:bg-neutral-divider border border-neutral-border text-neutral-primary font-semibold rounded-[6px] transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
          {errorMsg}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="bg-neutral-card p-6 rounded-[10px] border border-neutral-border shadow-level-1 space-y-4">
        <h3 className="text-[11px] font-semibold text-neutral-tertiary uppercase tracking-wider">
          Financial Position Overview ({dateMode === 'day' ? selectedDate : dateMode === 'month' ? selectedMonth : `${startDate} to ${endDate}`})
        </h3>

        {loading ? (
          <div className="p-8 text-center text-neutral-tertiary font-medium text-[13px] animate-pulse">
            Calculating report metrics...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setItemizedTab('invoices')}
              className="bg-purple-50 p-4 rounded-[10px] border border-purple-100 cursor-pointer hover:border-purple-300 transition"
            >
              <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">Invoices</span>
              <span className="text-[20px] font-bold text-purple-900 block mt-1">
                ₹ {totalInvoiced.toLocaleString('en-IN')}
              </span>
              <span className="text-[12px] text-purple-600 font-medium block mt-1">
                {reportData?.counts?.invoices || 0} invoice bills ➔
              </span>
            </div>

            <div
              onClick={() => setItemizedTab('salesPayments')}
              className="bg-emerald-50 p-4 rounded-[10px] border border-emerald-100 cursor-pointer hover:border-emerald-300 transition"
            >
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Cash Collected</span>
              <span className="text-[20px] font-bold text-emerald-900 block mt-1">
                ₹ {totalSalesReceived.toLocaleString('en-IN')}
              </span>
              <span className="text-[12px] text-emerald-600 font-medium block mt-1">
                {reportData?.counts?.salesPayments || 0} receipt payments ➔
              </span>
            </div>

            <div
              onClick={() => setItemizedTab('purchases')}
              className="bg-indigo-50 p-4 rounded-[10px] border border-indigo-100 cursor-pointer hover:border-indigo-300 transition"
            >
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">Supplier Purchases</span>
              <span className="text-[20px] font-bold text-indigo-900 block mt-1">
                ₹ {totalPurchasesSpend.toLocaleString('en-IN')}
              </span>
              <span className="text-[12px] text-indigo-600 font-medium block mt-1">
                {reportData?.counts?.purchases || 0} supplier bills ➔
              </span>
            </div>

            <div
              onClick={() => setItemizedTab('purchasePayments')}
              className="bg-teal-50 p-4 rounded-[10px] border border-teal-100 cursor-pointer hover:border-teal-300 transition"
            >
              <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider block">Supplier Cash Paid</span>
              <span className="text-[20px] font-bold text-teal-900 block mt-1">
                ₹ {totalPurchasePaid.toLocaleString('en-IN')}
              </span>
              <span className="text-[12px] text-teal-600 font-medium block mt-1">
                {reportData?.counts?.purchasePayments || 0} settlements ➔
              </span>
            </div>

            <div
              onClick={() => setItemizedTab('expenses')}
              className="bg-rose-50 p-4 rounded-[10px] border border-rose-100 sm:col-span-2 lg:col-span-2 cursor-pointer hover:border-rose-300 transition flex justify-between items-center"
            >
              <div>
                <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Factory Expenses</span>
                <span className="text-[12px] text-rose-600 font-medium">{reportData?.counts?.expenses || 0} overhead entries ➔</span>
              </div>
              <span className="text-[20px] font-bold text-rose-900">
                ₹ {totalExpenses.toLocaleString('en-IN')}
              </span>
            </div>

            <div className={`p-4 rounded-[10px] border sm:col-span-2 lg:col-span-2 text-center flex flex-col justify-center ${
              netPosition >= 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <span className="text-[11px] font-semibold uppercase tracking-wider block">Net Cash Position</span>
              <span className="text-[24px] font-bold block mt-0.5">
                ₹ {netPosition.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] opacity-80 block font-medium mt-0.5">
                (Cash Received − [Supplier Paid + Expenses])
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Daily Breakdown Table (Only shown in Monthly Mode) */}
      {dateMode === 'month' && dailyBreakdown.length > 0 && (
        <div className="bg-neutral-card p-6 rounded-[10px] border border-neutral-border shadow-level-1 space-y-4">
          <h3 className="text-[11px] font-semibold text-neutral-tertiary uppercase tracking-wider">
            Daily Financial Breakdown for {selectedMonth}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-neutral-bg border-b border-neutral-divider text-neutral-secondary font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Invoiced</th>
                  <th className="py-3 px-3 text-right">Cash Received</th>
                  <th className="py-3 px-3 text-right">Purchases Spend</th>
                  <th className="py-3 px-3 text-right">Supplier Paid</th>
                  <th className="py-3 px-3 text-right">Expenses</th>
                  <th className="py-3 px-3 text-right">Net Daily Cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-divider font-medium text-neutral-primary">
                {dailyBreakdown.map((row) => (
                  <tr key={row.date} className="hover:bg-neutral-bg transition">
                    <td className="py-2.5 px-3 font-semibold text-neutral-primary">{row.date}</td>
                    <td className="py-2.5 px-3 text-right text-purple-700">₹ {row.invoiced.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700">₹ {row.received.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right text-indigo-700">₹ {row.spend.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right text-teal-700">₹ {row.paid.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right text-rose-700">₹ {row.expenses.toLocaleString('en-IN')}</td>
                    <td className={`py-2.5 px-3 text-right font-bold ${row.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ₹ {row.net.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Itemized Audit Breakdown Table */}
      <div className="bg-neutral-card p-6 rounded-[10px] border border-neutral-border shadow-level-1 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-[11px] font-semibold text-neutral-tertiary uppercase tracking-wider">
            Itemized Transaction Drill-Down
          </h3>

          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-[13px] font-semibold">
            {[
              { id: 'invoices', label: `Invoices (${itemized.invoices.length})` },
              { id: 'salesPayments', label: `Sales Receipts (${itemized.salesPayments.length})` },
              { id: 'purchases', label: `Purchases (${itemized.purchases.length})` },
              { id: 'purchasePayments', label: `Supplier Payments (${itemized.purchasePayments.length})` },
              { id: 'expenses', label: `Expenses (${itemized.expenses.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setItemizedTab(tab.id)}
                className={`px-3 py-1.5 rounded-[6px] transition whitespace-nowrap border ${
                  itemizedTab === tab.id
                    ? 'bg-brand-primary text-white border-brand-primary shadow-level-1'
                    : 'bg-neutral-bg text-neutral-secondary border-neutral-border hover:bg-neutral-divider hover:text-neutral-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Breakdown List Content */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {itemizedTab === 'invoices' && (
            itemized.invoices.length === 0 ? (
              <p className="text-[13px] text-neutral-tertiary italic text-center py-6">No sales invoices recorded for this selection.</p>
            ) : (
              itemized.invoices.map(inv => (
                <div key={inv._id} className="p-3.5 bg-neutral-bg rounded-[8px] border border-neutral-border flex justify-between items-center text-[13px]">
                  <div>
                    <span className="font-semibold text-neutral-primary block text-[14px]">#{inv.billNo}</span>
                    <span className="text-[12px] text-neutral-secondary font-medium">{inv.customerName || 'Customer'}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-bold text-brand-primary text-[14px] block">₹ {inv.totalAmount.toLocaleString('en-IN')}</span>
                    <span className="text-[11px] font-semibold text-semantic-warning-text block">Pending: ₹ {(inv.amountPending || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )
          )}

          {itemizedTab === 'salesPayments' && (
            itemized.salesPayments.length === 0 ? (
              <p className="text-[13px] text-neutral-tertiary italic text-center py-6">No sales payment receipts collected for this selection.</p>
            ) : (
              itemized.salesPayments.map(p => (
                <div key={p._id} className="p-3.5 bg-neutral-bg rounded-[8px] border border-neutral-border flex justify-between items-center text-[13px]">
                  <div>
                    <span className="font-semibold text-emerald-800 block text-[13px]">
                      Payment for Bill #{p.invoiceId?.billNo || 'N/A'} ({p.invoiceId?.customerName || 'Customer'})
                    </span>
                    <span className="text-[11px] text-neutral-tertiary">{new Date(p.capturedAt || p.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-bold text-emerald-700 text-[14px] block">₹ {p.amount.toLocaleString('en-IN')}</span>
                    {p.receiptImageUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(p.receiptImageUrl)}
                        className="text-[11px] text-brand-primary hover:underline font-semibold mt-1"
                      >
                        View Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))
            )
          )}

          {itemizedTab === 'purchases' && (
            itemized.purchases.length === 0 ? (
              <p className="text-[13px] text-neutral-tertiary italic text-center py-6">No supplier purchases recorded for this selection.</p>
            ) : (
              itemized.purchases.map(pur => (
                <div key={pur._id} className="p-3.5 bg-neutral-bg rounded-[8px] border border-neutral-border flex justify-between items-center text-[13px]">
                  <div>
                    <span className="font-semibold text-neutral-primary block text-[14px]">#{pur.billNo}</span>
                    <span className="text-[12px] text-neutral-secondary font-medium">{pur.supplierName || 'Supplier'}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-bold text-indigo-700 text-[14px] block">₹ {pur.totalAmount.toLocaleString('en-IN')}</span>
                    <span className="text-[11px] font-semibold text-semantic-warning-text block">Pending: ₹ {(pur.amountPending || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )
          )}

          {itemizedTab === 'purchasePayments' && (
            itemized.purchasePayments.length === 0 ? (
              <p className="text-[13px] text-neutral-tertiary italic text-center py-6">No supplier payments settled for this selection.</p>
            ) : (
              itemized.purchasePayments.map(p => (
                <div key={p._id} className="p-3.5 bg-neutral-bg rounded-[8px] border border-neutral-border flex justify-between items-center text-[13px]">
                  <div>
                    <span className="font-semibold text-teal-800 block text-[13px]">
                      Payment for Purchase #{p.purchaseId?.billNo || 'N/A'} ({p.purchaseId?.supplierName || 'Supplier'})
                    </span>
                    <span className="text-[11px] text-neutral-tertiary">{new Date(p.capturedAt || p.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-bold text-teal-700 text-[14px] block">₹ {p.amount.toLocaleString('en-IN')}</span>
                    {p.receiptImageUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(p.receiptImageUrl)}
                        className="text-[11px] text-brand-primary hover:underline font-semibold mt-1"
                      >
                        View Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))
            )
          )}

          {itemizedTab === 'expenses' && (
            itemized.expenses.length === 0 ? (
              <p className="text-[13px] text-neutral-tertiary italic text-center py-6">No expenses recorded for this selection.</p>
            ) : (
              itemized.expenses.map(exp => (
                <div key={exp._id} className="p-3.5 bg-neutral-bg rounded-[8px] border border-neutral-border flex justify-between items-center text-[13px]">
                  <div>
                    <span className="font-semibold text-neutral-primary uppercase block">{exp.category ? exp.category.replace('_', ' ') : 'EXPENSE'}</span>
                    <span className="text-[12px] text-neutral-secondary font-medium">{exp.description || 'No description'}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-bold text-rose-700 text-[14px] block">₹ {exp.amount.toLocaleString('en-IN')}</span>
                    {exp.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(exp.imageUrl)}
                        className="text-[11px] text-brand-primary hover:underline font-semibold mt-1"
                      >
                        View Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Expanded Image Viewer Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white font-black rounded-full w-10 h-10 flex items-center justify-center text-lg backdrop-blur-md transition"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Receipt Image"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <span className="text-xs text-white/70 font-semibold mt-3 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
              Tap anywhere to close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsView;
