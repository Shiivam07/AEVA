import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Printer,
  Download,
  Send,
  Mail,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  Sparkles,
  Sliders,
  Receipt,
  QrCode,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  PlusCircle,
  Save,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/useToast'
import api from '@/lib/api'

export type ReceiptPreset = 'corporate' | 'minimal' | 'thermal' | 'luxury'

interface ReceiptOptions {
  showBranding: boolean
  showTax: boolean
  showCustomer: boolean
  showAccount: boolean
  showBarcode: boolean
  showSignature: boolean
  showTerms: boolean
}

export interface OrderReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  orders?: any[]
  initialManualMode?: boolean
  availableBrands?: any[]
  onOrderSaved?: () => void
}

function generateRandomOrderId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000)
  return `ORD-2026-${randomNum}`
}

export default function OrderReceiptModal({
  isOpen,
  onClose,
  orders = [],
  initialManualMode = false,
  availableBrands = [],
  onOrderSaved,
}: OrderReceiptModalProps) {
  const { toast } = useToast()
  const printRef = useRef<HTMLDivElement>(null)

  // Mode: 'orders' or 'manual'
  const hasOrders = orders.length > 0
  const [modalMode, setModalMode] = useState<'orders' | 'manual'>(
    initialManualMode || !hasOrders ? 'manual' : 'orders'
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [activePreset, setActivePreset] = useState<ReceiptPreset>('corporate')
  const [activeTab, setActiveTab] = useState<'preview' | 'send'>('preview')
  const [copied, setCopied] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  // Customizable Checkbox Options
  const [options, setOptions] = useState<ReceiptOptions>({
    showBranding: true,
    showTax: true,
    showCustomer: true,
    showAccount: true,
    showBarcode: true,
    showSignature: true,
    showTerms: true,
  })

  // Manual Receipt Form States
  const [manualOrderId, setManualOrderId] = useState(generateRandomOrderId())
  const [manualBrandId, setManualBrandId] = useState('')
  const [manualBrandName, setManualBrandName] = useState('')
  const [manualBrandCode, setManualBrandCode] = useState('AEV')
  const [manualCustomerName, setManualCustomerName] = useState('Vikram Sharma')
  const [manualCustomerEmail, setManualCustomerEmail] = useState('vikram.sharma@example.com')
  const [manualProductName, setManualProductName] = useState('Premium Commercial Order Batch')
  const [manualProductCode, setManualProductCode] = useState('')
  const [manualSku, setManualSku] = useState('')
  const [manualQuantity, setManualQuantity] = useState(1)
  const [manualPricePerOrder, setManualPricePerOrder] = useState('4500')
  const [manualPriceNotDecided, setManualPriceNotDecided] = useState(false)
  const [manualIsEstimated, setManualIsEstimated] = useState(false)
  const [manualChannel, setManualChannel] = useState('Direct Corporate Portal')
  const [manualNotes, setManualNotes] = useState('')

  // Email form state
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [customNotes, setCustomNotes] = useState(
    'Please find your official tax invoice receipt attached. Thank you for your business.'
  )

  // Initialize or reset brand choices
  useEffect(() => {
    if (availableBrands && availableBrands.length > 0 && !manualBrandId) {
      const first = availableBrands[0]
      setManualBrandId(first.id)
      setManualBrandName(first.brandName || first.name || 'AEVA Portfolio')
      setManualBrandCode(first.brandCode || first.code || 'AEV')
    }
  }, [availableBrands, manualBrandId])

  // Reset mode if opened with/without orders
  useEffect(() => {
    if (isOpen) {
      if (initialManualMode || !orders.length) {
        setModalMode('manual')
        setManualOrderId(generateRandomOrderId())
      } else {
        setModalMode('orders')
        setCurrentIndex(0)
      }
    }
  }, [isOpen, initialManualMode, orders.length])

  // Current active order based on mode
  const currentOrder =
    modalMode === 'orders' && orders.length > 0
      ? orders[currentIndex] || orders[0]
      : {
          id: 'manual-draft',
          orderNumber: manualOrderId,
          externalOrderReference: manualOrderId,
          customerName: manualCustomerName || 'Valued Client',
          customerEmail: manualCustomerEmail,
          quantity: Math.max(1, manualQuantity || 1),
          pricePerOrder: manualPriceNotDecided ? 0 : parseFloat(manualPricePerOrder) || 0,
          totalAmount: manualPriceNotDecided
            ? 0
            : (Math.max(1, manualQuantity || 1)) * (parseFloat(manualPricePerOrder) || 0),
          priceNotDecided: manualPriceNotDecided,
          isEstimated: manualIsEstimated,
          orderStatus: manualPriceNotDecided ? 'ESTIMATE_PENDING' : 'PAID & VERIFIED',
          orderDate: new Date().toISOString(),
          brand: {
            id: manualBrandId,
            brandName: manualBrandName || 'AEVA Operations',
            brandCode: manualBrandCode || 'AEV',
            name: manualBrandName || 'AEVA Operations',
            code: manualBrandCode || 'AEV',
          },
          product: {
            productName: manualProductName || 'Commercial Order Item',
            sku: manualSku.trim() || 'N/A',
            productCode: manualProductCode.trim() || 'N/A',
          },
          orderingId: {
            platformName: manualChannel || 'Direct Marketplace',
            externalIdentifier: `CH-${manualOrderId.slice(-6)}`,
          },
          notes: manualNotes,
        }

  // Synchronize email form when current order changes
  useEffect(() => {
    if (currentOrder) {
      setRecipientEmail(currentOrder.customerEmail || '')
      setRecipientName(currentOrder.customerName || 'Customer')
    }
  }, [currentOrder?.customerEmail, currentOrder?.customerName, modalMode, currentIndex])

  if (!isOpen) return null

  // Calculation variables
  const isPriceNotDecided = Boolean(currentOrder.priceNotDecided)
  const isEstimatedPrice = Boolean(currentOrder.isEstimated)
  const quantity = Math.max(1, currentOrder.quantity || 1)
  const pricePerOrder =
    currentOrder.pricePerOrder !== undefined && currentOrder.pricePerOrder !== null
      ? Number(currentOrder.pricePerOrder)
      : quantity > 0
      ? Number(currentOrder.totalAmount || currentOrder.actualAmount || 0) / quantity
      : 0

  const calculatedBaseAmount = isPriceNotDecided ? 0 : pricePerOrder * quantity
  const taxRate = 0.18
  const grandTotal = isPriceNotDecided
    ? 0
    : Number(currentOrder.totalAmount || calculatedBaseAmount)
  const baseSubtotal = options.showTax ? grandTotal / (1 + taxRate) : grandTotal
  const gstAmount = options.showTax ? grandTotal - baseSubtotal : 0

  const orderNumber =
    currentOrder.orderNumber ||
    currentOrder.externalOrderReference ||
    `ORD-2026-${String(currentOrder.id || '').slice(0, 6).toUpperCase()}`

  const receiptNumber = `INV-${orderNumber.replace(/[^A-Z0-9]/gi, '')}`
  const brandName =
    currentOrder.brand?.brandName || currentOrder.brand?.name || 'AEVA Enterprise'
  const brandCode =
    currentOrder.brand?.brandCode || currentOrder.brand?.code || 'AEV'

  const orderDate = new Date(
    currentOrder.orderDate || currentOrder.createdAt || Date.now()
  ).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  // Format SKU and Product Code with explicit N/A fallbacks
  const rawSku = currentOrder.product?.sku
  const rawProductCode = currentOrder.product?.productCode
  const displaySku = rawSku && rawSku.trim() !== '' && rawSku !== 'N/A' ? rawSku : 'N/A'
  const displayProductCode =
    rawProductCode && rawProductCode.trim() !== '' && rawProductCode !== 'N/A'
      ? rawProductCode
      : 'N/A'
  const displayProductName =
    currentOrder.product?.productName || 'Commercial Order Item'

  const toggleOption = (key: keyof ReceiptOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleBrandChange = (brandId: string) => {
    setManualBrandId(brandId)
    const selected = availableBrands?.find((b) => b.id === brandId)
    if (selected) {
      setManualBrandName(selected.brandName || selected.name)
      setManualBrandCode(selected.brandCode || selected.code || 'AEV')
    }
  }

  // Print function
  const handlePrint = () => {
    window.print()
  }

  // Download Standalone HTML file (Genuine commercial invoice styling)
  const handleDownloadHtml = () => {
    if (!printRef.current) return
    const receiptContent = printRef.current.innerHTML

    let presetCss = ''
    if (activePreset === 'thermal') {
      presetCss = `
        body { font-family: 'Courier New', Courier, monospace; background: #faf9f6; }
        .receipt-container { background: #fffdf7; border: 2px dashed #9ca3af; max-width: 460px; font-size: 13px; }
        table { font-family: 'Courier New', Courier, monospace; }
      `
    } else if (activePreset === 'luxury') {
      presetCss = `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1120; color: #f1f5f9; }
        .receipt-container { background: linear-gradient(180deg, #0b1329, #0f172a); border: 2px solid #f59e0b; color: #f8fafc; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        th { color: #f59e0b !important; }
        .grand-total { color: #f59e0b !important; }
      `
    } else if (activePreset === 'minimal') {
      presetCss = `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; color: #111111; }
        .receipt-container { border: 2px solid #000000; border-radius: 0; box-shadow: none; }
      `
    } else {
      presetCss = `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; }
        .receipt-container { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
      `
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${orderNumber} - AEVA</title>
  <style>
    body { margin: 0; padding: 36px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .receipt-container { max-width: 680px; margin: 0 auto; padding: 36px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(128,128,128,0.2); }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    ${presetCss}
  </style>
</head>
<body>
  <div class="receipt-container">
    ${receiptContent}
  </div>
</body>
</html>`

    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tax-invoice-${orderNumber}.html`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Tax Invoice Downloaded',
      description: `Saved tax-invoice-${orderNumber}.html to your device.`,
    })
  }

  // Save manual receipt as an order in the database
  const handleSaveManualOrder = async () => {
    if (!manualBrandId && availableBrands?.length) {
      toast({
        title: 'Brand Required',
        description: 'Please select a brand for this order.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingOrder(true)
    try {
      await api.post('/orders', {
        brandId: manualBrandId || availableBrands?.[0]?.id,
        orderNumber: manualOrderId,
        customerName: manualCustomerName,
        customerEmail: manualCustomerEmail,
        productName: manualProductName,
        sku: manualSku || 'N/A',
        productCode: manualProductCode || 'N/A',
        quantity: Math.max(1, manualQuantity || 1),
        pricePerOrder: manualPriceNotDecided ? 0 : parseFloat(manualPricePerOrder) || 0,
        totalAmount: manualPriceNotDecided ? 0 : grandTotal,
        priceNotDecided: manualPriceNotDecided,
        isEstimated: manualIsEstimated,
        currency: 'INR',
        notes: manualNotes,
      })

      toast({
        title: 'Order Saved to System! 🎉',
        description: `Order ${manualOrderId} recorded with calculated total.`,
      })
      if (onOrderSaved) onOrderSaved()
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.response?.data?.message || 'Could not save order.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingOrder(false)
    }
  }

  // Send Email receipt
  const handleSendReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientEmail) {
      toast({
        title: 'Email Required',
        description: 'Please provide a valid recipient email.',
        variant: 'destructive',
      })
      return
    }

    setIsSending(true)
    try {
      // If in manual mode, save order first if not saved
      let orderIdToSend = currentOrder.id
      if (modalMode === 'manual' || orderIdToSend === 'manual-draft') {
        const createRes = await api.post('/orders', {
          brandId: manualBrandId || availableBrands?.[0]?.id,
          orderNumber: manualOrderId,
          customerName: manualCustomerName,
          customerEmail: recipientEmail,
          productName: manualProductName,
          sku: manualSku || 'N/A',
          productCode: manualProductCode || 'N/A',
          quantity: Math.max(1, manualQuantity || 1),
          pricePerOrder: manualPriceNotDecided ? 0 : parseFloat(manualPricePerOrder) || 0,
          totalAmount: manualPriceNotDecided ? 0 : grandTotal,
          priceNotDecided: manualPriceNotDecided,
          isEstimated: manualIsEstimated,
          currency: 'INR',
          notes: manualNotes,
        })
        orderIdToSend = createRes.data?.data?.id
        if (onOrderSaved) onOrderSaved()
      }

      await api.post('/orders/send-receipt', {
        orderIds: [orderIdToSend],
        recipientEmail,
        recipientName: recipientName || 'Valued Customer',
        presetTemplate: activePreset,
        customNotes,
      })

      toast({
        title: 'Official Invoice Sent! ✉️',
        description: `Tax receipt dispatched to ${recipientEmail}`,
      })
      setActiveTab('preview')
    } catch (err: any) {
      toast({
        title: 'Dispatch Failed',
        description:
          err.response?.data?.message || 'Could not send invoice receipt. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  // Copy shareable link
  const handleCopyLink = () => {
    const fakeLink = `${window.location.origin}/orders/${orderNumber}/invoice?preset=${activePreset}`
    navigator.clipboard.writeText(fakeLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: 'Invoice Link Copied',
      description: 'Official digital invoice URL copied to clipboard.',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-black/80 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      {/* Print-specific style isolating only #printable-receipt */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-receipt, #printable-receipt * { visibility: visible !important; }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="relative w-full max-w-6xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden no-print">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-border bg-muted/40 gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  Official Receipt & Invoice Generator
                </h2>
                <Badge variant="outline" className="font-mono text-xs">
                  {modalMode === 'manual'
                    ? 'Custom Manual Generator'
                    : `${orders.length} Selected`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Generate authentic corporate tax receipts, calculate prices per order, download PDF/HTML, or dispatch
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted p-1 rounded-xl border border-border/80 text-xs font-medium">
              {hasOrders && (
                <button
                  onClick={() => setModalMode('orders')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    modalMode === 'orders'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Selected Orders ({orders.length})
                </button>
              )}
              <button
                onClick={() => setModalMode('manual')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  modalMode === 'manual'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Manual Receipt Generator
              </button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-2.5 border-b border-border bg-background text-xs gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('preview')}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <FileText className="h-3.5 w-3.5" /> Preview & Customize
            </Button>
            <Button
              variant={activeTab === 'send' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('send')}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Send className="h-3.5 w-3.5" /> Send to Customer
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {modalMode === 'orders' && orders.length > 1 && (
              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg text-xs font-medium mr-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="p-1 hover:text-primary disabled:opacity-30"
                  title="Previous Order"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span>
                  {currentIndex + 1} of {orders.length}
                </span>
                <button
                  disabled={currentIndex === orders.length - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(orders.length - 1, prev + 1))}
                  className="p-1 hover:text-primary disabled:opacity-30"
                  title="Next Order"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-8 gap-1.5 text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Share Link'}
            </Button>

            <Button variant="outline" size="sm" onClick={handleDownloadHtml} className="h-8 gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Download HTML
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-muted/20">
          {/* Left Column: Generator Form or Preset & Checkbox Controls */}
          <div className="lg:col-span-5 space-y-4">
            {/* If Manual Mode: Interactive Receipt Generator Form */}
            {modalMode === 'manual' ? (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    <PlusCircle className="h-4 w-4 text-primary" />
                    Fill Receipt Specifications
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setManualOrderId(generateRandomOrderId())}
                    className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
                    title="Generate New Auto Order ID"
                  >
                    <RefreshCw className="h-3 w-3" /> Auto Order ID
                  </Button>
                </div>

                {/* Order ID & Brand Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Order Reference ID *
                    </label>
                    <div className="relative">
                      <Input
                        value={manualOrderId}
                        onChange={(e) => setManualOrderId(e.target.value)}
                        className="h-8 text-xs font-mono font-bold"
                        placeholder="ORD-2026-XXXXXX"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Brand / Portfolio *
                    </label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={manualBrandId}
                      onChange={(e) => handleBrandChange(e.target.value)}
                    >
                      {availableBrands && availableBrands.length > 0 ? (
                        availableBrands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.brandName || b.name} ({b.brandCode || b.code})
                          </option>
                        ))
                      ) : (
                        <option value="">AEVA Operations (AEV)</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Customer Name
                    </label>
                    <Input
                      value={manualCustomerName}
                      onChange={(e) => setManualCustomerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Customer Email
                    </label>
                    <Input
                      type="email"
                      value={manualCustomerEmail}
                      onChange={(e) => setManualCustomerEmail(e.target.value)}
                      placeholder="customer@domain.com"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Product / Item Description */}
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Item / Product Description *
                  </label>
                  <Input
                    value={manualProductName}
                    onChange={(e) => setManualProductName(e.target.value)}
                    placeholder="e.g. Compression Activewear Set"
                    className="h-8 text-xs font-medium"
                  />
                </div>

                {/* Product Code & SKU (Explicit N/A Fallback) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Product Code
                    </label>
                    <Input
                      value={manualProductCode}
                      onChange={(e) => setManualProductCode(e.target.value)}
                      placeholder="Leave blank for N/A"
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground">Shows N/A if empty</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Product SKU
                    </label>
                    <Input
                      value={manualSku}
                      onChange={(e) => setManualSku(e.target.value)}
                      placeholder="Leave blank for N/A"
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground">Shows N/A if empty</span>
                  </div>
                </div>

                {/* Number of Orders & Price per Order */}
                <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-3">
                  <div className="text-xs font-bold text-foreground">
                    Order Pricing & Cost Calculation
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-foreground block mb-1">
                        Number of Orders / Qty *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={manualQuantity}
                        onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-8 text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block mb-1">
                        Price per Order (₹) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        disabled={manualPriceNotDecided}
                        value={manualPricePerOrder}
                        onChange={(e) => setManualPricePerOrder(e.target.value)}
                        placeholder="0.00"
                        className={`h-8 text-xs font-mono font-bold ${
                          manualPriceNotDecided ? 'opacity-40' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Pricing Mode Checkboxes */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={manualPriceNotDecided}
                        onChange={(e) => {
                          setManualPriceNotDecided(e.target.checked)
                          if (e.target.checked) setManualIsEstimated(false)
                        }}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
                      />
                      <span>Price not yet decided (Mark as Quote Pending)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        disabled={manualPriceNotDecided}
                        checked={manualIsEstimated}
                        onChange={(e) => setManualIsEstimated(e.target.checked)}
                        className={`h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary ${
                          manualPriceNotDecided ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      />
                      <span>Calculate as Estimated Price</span>
                    </label>
                  </div>

                  {/* Live Cost Calculation Summary Box */}
                  <div className="p-2.5 rounded-lg bg-background border border-border text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Formula:</span>
                      <span className="font-mono">
                        {manualQuantity} order{manualQuantity > 1 ? 's' : ''} × ₹
                        {manualPriceNotDecided ? 'TBD' : parseFloat(manualPricePerOrder || '0').toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/60">
                      <span>Calculated Total:</span>
                      <span className="font-mono text-primary">
                        {manualPriceNotDecided
                          ? 'Price Not Yet Decided'
                          : `₹${(manualQuantity * (parseFloat(manualPricePerOrder) || 0)).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}${manualIsEstimated ? ' (Estimated)' : ''}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save to System Button */}
                <Button
                  onClick={handleSaveManualOrder}
                  disabled={isSavingOrder}
                  variant="outline"
                  className="w-full gap-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
                >
                  {isSavingOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save as Official Order into System
                </Button>
              </div>
            ) : null}

            {/* Presets Selector */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Receipt Design Presets
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'corporate',
                    label: 'Corporate Tax Invoice',
                    desc: 'Official GST business tax invoice, executive format',
                  },
                  {
                    id: 'minimal',
                    label: 'Modern Minimal',
                    desc: 'Clean monochrome borders, high-contrast typography',
                  },
                  {
                    id: 'thermal',
                    label: 'Thermal POS Slip',
                    desc: 'Retail store cash register receipt layout',
                  },
                  {
                    id: 'luxury',
                    label: 'Commercial Boutique',
                    desc: 'Navy obsidian theme with gold commercial seal',
                  },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setActivePreset(preset.id as ReceiptPreset)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      activePreset === preset.id
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="text-xs font-semibold">{preset.label}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  Preset Display Options (Checkboxes)
                </span>
                <span className="text-[10px] text-primary lowercase font-medium">live toggle</span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={options.showBranding}
                    onChange={() => toggleOption('showBranding')}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <span>Show Corporate Entity & Brand Header</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={options.showTax}
                    onChange={() => toggleOption('showTax')}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <span>Show 18% GST Itemized Tax Breakdown</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={options.showCustomer}
                    onChange={() => toggleOption('showCustomer')}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <span>Show Customer Bill-To & Delivery Details</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={options.showAccount}
                    onChange={() => toggleOption('showAccount')}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <span>Show Ordering Account & Marketplace Channel</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={options.showBarcode}
                    onChange={() => toggleOption('showBarcode')}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <span>Show Security Verification Barcode & IRN</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={options.showSignature}
                    onChange={() => toggleOption('showSignature')}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <span>Show Authorized Signatory Stamp</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={options.showTerms}
                    onChange={() => toggleOption('showTerms')}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <span>Show Commercial Terms & Return Policy Note</span>
                </label>
              </div>
            </div>

            {/* Quick Email Dispatch Box */}
            {activeTab === 'send' && (
              <form onSubmit={handleSendReceipt} className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Mail className="h-3.5 w-3.5" />
                  Dispatch Tax Invoice Email
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Recipient Email *
                  </label>
                  <Input
                    required
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="customer@domain.com"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Recipient Full Name
                  </label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Customer Name"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Message Note
                  </label>
                  <textarea
                    rows={2}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <Button type="submit" disabled={isSending} className="w-full gap-2 text-xs" size="sm">
                  {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Dispatch Official Receipt
                </Button>
              </form>
            )}
          </div>

          {/* Right Column: Live Printable Receipt Card */}
          <div className="lg:col-span-7 flex justify-center items-start">
            <div
              id="printable-receipt"
              ref={printRef}
              className={`w-full max-w-xl transition-all shadow-xl rounded-2xl overflow-hidden ${
                activePreset === 'corporate'
                  ? 'bg-card border-2 border-primary/25 text-foreground'
                  : activePreset === 'minimal'
                  ? 'bg-white text-zinc-950 border-2 border-black dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-700 font-sans'
                  : activePreset === 'thermal'
                  ? 'bg-[#fefdf8] text-zinc-900 border-2 border-dashed border-zinc-400 font-mono text-xs dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700'
                  : 'bg-gradient-to-b from-slate-950 via-[#0d1527] to-slate-950 text-slate-100 border-2 border-amber-500/40 shadow-amber-500/10'
              }`}
            >
              {/* Preset Top Ribbon */}
              {activePreset === 'luxury' && (
                <div className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 py-1.5 px-4 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-950 flex items-center justify-center gap-2">
                  <span>★</span>
                  <span>COMMERCIAL TAX INVOICE • AEVA ENTERPRISE NETWORK</span>
                  <span>★</span>
                </div>
              )}
              {activePreset === 'thermal' && (
                <div className="bg-zinc-100 dark:bg-zinc-800 py-1 px-4 text-center text-[10px] font-mono tracking-widest text-zinc-700 dark:text-zinc-300 border-b border-dashed border-zinc-300 dark:border-zinc-700">
                  * * * AEVA RETAIL TERMINAL CASH RECEIPT * * *
                </div>
              )}
              {activePreset === 'corporate' && (
                <div className="bg-primary/10 border-b border-primary/20 py-1 px-4 text-center text-[10px] font-bold uppercase tracking-wider text-primary">
                  OFFICIAL COMMERCIAL TAX INVOICE • AEVA OPERATIONS NETWORK
                </div>
              )}

              {/* Receipt Inner Body */}
              <div className="p-6 sm:p-8 space-y-5">
                {/* 1. Header & Registered Business Block */}
                <div className="flex items-start justify-between border-b pb-4 border-current/15 gap-4">
                  <div>
                    {options.showBranding && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className={`h-6 w-6 rounded-md flex items-center justify-center font-bold text-xs shadow-sm ${
                            activePreset === 'luxury'
                              ? 'bg-amber-400 text-slate-950'
                              : activePreset === 'minimal'
                              ? 'bg-black text-white dark:bg-white dark:text-black'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-extrabold text-sm tracking-wider uppercase">
                          AEVA OPERATIONS
                        </span>
                      </div>
                    )}
                    <h3
                      className={`text-xl font-black tracking-tight ${
                        activePreset === 'luxury' ? 'text-amber-300' : ''
                      }`}
                    >
                      {brandName}
                    </h3>
                    <p className="text-xs opacity-80">
                      Brand Code: <span className="font-mono font-bold uppercase">{brandCode}</span> • Marketed by AEVA Multi-Brand Network
                    </p>
                    <div className="text-[10px] opacity-70 mt-1 space-y-0.5">
                      <div>GSTIN: <span className="font-mono font-semibold">07AABCA2026F1Z8</span> | PAN: <span className="font-mono font-semibold">AABCA2026F</span></div>
                      <div>CIN: <span className="font-mono">U74999DL2026PTC394810</span> • State Code: 07 (NCR)</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase mb-1 ${
                        isPriceNotDecided
                          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                          : activePreset === 'luxury'
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : activePreset === 'minimal'
                          ? 'border border-black dark:border-white text-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {isPriceNotDecided
                        ? 'PROFORMA / ESTIMATE'
                        : isEstimatedPrice
                        ? 'ESTIMATED TAX INVOICE'
                        : 'TAX INVOICE / CASH MEMO'}
                    </div>
                    <div className="text-xs font-mono font-bold">{receiptNumber}</div>
                    <div className="text-[11px] opacity-75">Date: {orderDate}</div>
                    <div className="mt-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPriceNotDecided
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : activePreset === 'luxury'
                            ? 'bg-amber-400/20 text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isPriceNotDecided
                          ? 'QUOTE PENDING'
                          : currentOrder.orderStatus || 'PAID & VERIFIED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Customer & Ordering Channel Metadata */}
                {(options.showCustomer || options.showAccount) && (
                  <div className="grid grid-cols-2 gap-4 text-xs py-1">
                    {options.showCustomer && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase opacity-60">Bill To / Deliver To:</span>
                        <div className="font-bold text-sm">
                          {currentOrder.customerName || recipientName || 'Valued Client'}
                        </div>
                        {currentOrder.customerEmail && (
                          <div className="opacity-75 text-xs">{currentOrder.customerEmail}</div>
                        )}
                        <div className="opacity-60 text-[10px]">Place of Supply: National Capital Region (07)</div>
                      </div>
                    )}

                    {options.showAccount && (
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] font-bold uppercase opacity-60">Order Reference:</span>
                        <div className="font-mono font-bold text-xs">{orderNumber}</div>
                        <div className="opacity-75 text-xs">
                          Channel:{' '}
                          <span className="font-semibold">
                            {currentOrder.orderingId?.platformName || 'Direct Portal'}
                          </span>
                        </div>
                        {currentOrder.orderingId?.externalIdentifier && (
                          <div className="text-[10px] font-mono opacity-60">
                            Identifier: {currentOrder.orderingId.externalIdentifier}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Items & Line Breakdown Table */}
                <div className="border-t border-b border-current/15 py-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="opacity-60 uppercase text-[10px] border-b border-current/10">
                        <th className="text-left py-2">Item Description</th>
                        <th className="text-left py-2">Product Code</th>
                        <th className="text-left py-2">SKU</th>
                        <th className="text-center py-2">Number of Orders</th>
                        <th className="text-right py-2">Price per Order (₹)</th>
                        <th className="text-right py-2">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-current/5">
                      <tr>
                        <td className="py-2.5 font-medium">
                          <div className="font-bold">{displayProductName}</div>
                          <div className="text-[10px] opacity-60">HSN: 998311 • Standard Commercial Unit</div>
                        </td>
                        <td className="py-2.5 font-mono text-[11px] font-semibold opacity-90">
                          {displayProductCode}
                        </td>
                        <td className="py-2.5 font-mono text-[11px] font-semibold opacity-90">
                          {displaySku}
                        </td>
                        <td className="text-center py-2.5 font-bold">{quantity}</td>
                        <td className="text-right py-2.5 font-mono">
                          {isPriceNotDecided ? (
                            <span className="text-amber-500 font-semibold text-[11px]">Not Yet Decided</span>
                          ) : (
                            `₹${pricePerOrder.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}${isEstimatedPrice ? ' (Est.)' : ''}`
                          )}
                        </td>
                        <td className="text-right py-2.5 font-mono font-bold">
                          {isPriceNotDecided ? (
                            <span className="text-amber-500 font-semibold text-[11px]">TBD</span>
                          ) : (
                            `₹${baseSubtotal.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. Financial Calculation Summary */}
                <div className="flex justify-between items-start pt-1 gap-4">
                  <div className="space-y-2 max-w-[260px]">
                    {options.showBarcode && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase opacity-75">
                          <QrCode className="h-3.5 w-3.5 text-primary" />
                          Tax IRN & Security Verification
                        </div>
                        <div className="font-mono text-[9px] tracking-widest bg-current/5 px-2 py-1 rounded inline-block">
                          ||| | ||||| || |||| ||| {receiptNumber}
                        </div>
                      </div>
                    )}

                    {options.showTerms && (
                      <p className="text-[9.5px] opacity-60 leading-tight">
                        Computer generated commercial tax invoice issued under IT Act 2000. Goods/services covered under standard commercial SLA and 14-day warranty policy.
                      </p>
                    )}
                  </div>

                  <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between opacity-75">
                      <span>Subtotal:</span>
                      <span className="font-mono">
                        {isPriceNotDecided
                          ? 'TBD'
                          : `₹${baseSubtotal.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                      </span>
                    </div>

                    {options.showTax && (
                      <div className="flex justify-between opacity-75">
                        <span>GST (18% IGST):</span>
                        <span className="font-mono">
                          {isPriceNotDecided
                            ? 'TBD'
                            : `₹${gstAmount.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between opacity-75">
                      <span>Freight & Logistics:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">FREE</span>
                    </div>

                    <div className="border-t border-current/20 pt-2 flex justify-between items-baseline font-black text-sm">
                      <span>Total Amount:</span>
                      <span
                        className={`font-mono text-base ${
                          isPriceNotDecided
                            ? 'text-amber-500 font-bold text-sm'
                            : activePreset === 'luxury'
                            ? 'text-amber-400 font-extrabold'
                            : activePreset === 'minimal'
                            ? 'text-black dark:text-white font-bold'
                            : 'text-primary'
                        }`}
                      >
                        {isPriceNotDecided
                          ? 'Price Not Yet Decided'
                          : `₹${grandTotal.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}${isEstimatedPrice ? ' (Estimated)' : ''}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Official Regulatory & Authorized Signatory Footer */}
                <div className="border-t border-current/15 pt-3.5 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      Authentic Tax Invoice • Certified Record
                    </div>
                    <div className="text-[10px] opacity-60 mt-0.5">
                      Registered Corporate Clearance • Pan-India Inter-State Inflow
                    </div>
                  </div>

                  {options.showSignature && (
                    <div className="text-center sm:text-right">
                      <div className="text-[10px] opacity-75 font-semibold uppercase tracking-wider mb-1">
                        For AEVA Operations & Brand Partner
                      </div>
                      <div
                        className={`font-serif italic font-bold text-sm tracking-wider border-b border-current/30 pb-0.5 px-3 inline-block ${
                          activePreset === 'luxury'
                            ? 'text-amber-400'
                            : activePreset === 'minimal'
                            ? 'text-black dark:text-white'
                            : 'text-primary'
                        }`}
                      >
                        Authorized Signatory
                      </div>
                      <div className="text-[9px] opacity-60 uppercase tracking-widest mt-0.5">
                        Accounts & Commercial Division
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
