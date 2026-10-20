import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import OwnerLayout from '@/components/layout/OwnerLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/hooks/useToast'
import OrderReceiptModal from '@/components/orders/OrderReceiptModal'
import {
  ShoppingCart,
  Plus,
  Search,
  Receipt,
  FileSpreadsheet,
  Upload,
  Calendar,
  Loader2,
  CheckSquare,
  Square,
  FileDown,
  Send,
  X,
  FileText,
  RefreshCw,
  Calculator,
} from 'lucide-react'
import api from '@/lib/api'

function generateAutoOrderNumber(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000)
  return `ORD-2026-${randomNum}`
}

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Receipt modal states
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isManualReceiptMode, setIsManualReceiptMode] = useState(false)
  const [receiptOrders, setReceiptOrders] = useState<any[]>([])
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])

  // Record Order Form states
  const [brandId, setBrandId] = useState('')
  const [orderNumber, setOrderNumber] = useState(generateAutoOrderNumber())
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [productName, setProductName] = useState('')
  const [productCode, setProductCode] = useState('')
  const [productSku, setProductSku] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [pricePerOrder, setPricePerOrder] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [priceNotDecided, setPriceNotDecided] = useState(false)
  const [isEstimated, setIsEstimated] = useState(false)
  const [currency, setCurrency] = useState('INR')

  // Fetch businesses & brands
  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get('/businesses').then((r) => r.data.data),
  })
  const currentBusinessId = businesses?.[0]?.id

  const { data: brands } = useQuery({
    queryKey: ['brands', currentBusinessId],
    queryFn: () => api.get(`/brands?businessId=${currentBusinessId}`).then((r) => r.data.data),
    enabled: !!currentBusinessId,
  })

  // Fetch orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, currentBusinessId],
    queryFn: () => {
      const url = statusFilter !== 'ALL'
        ? `/orders?businessId=${currentBusinessId}&status=${statusFilter}`
        : `/orders?businessId=${currentBusinessId}`
      return api.get(url).then((r) => r.data.data)
    },
    enabled: !!currentBusinessId,
  })

  // Auto calculate total cost when quantity or pricePerOrder changes
  const handleQuantityChange = (val: number) => {
    const q = Math.max(1, val || 1)
    setQuantity(q)
    if (!priceNotDecided && pricePerOrder) {
      const calculated = q * (parseFloat(pricePerOrder) || 0)
      setTotalAmount(calculated ? calculated.toFixed(2) : '')
    }
  }

  const handlePricePerOrderChange = (val: string) => {
    setPricePerOrder(val)
    if (!priceNotDecided) {
      const p = parseFloat(val) || 0
      const calculated = quantity * p
      setTotalAmount(calculated ? calculated.toFixed(2) : '')
    }
  }

  // Create order
  const createOrder = useMutation({
    mutationFn: (data: any) => api.post('/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsCreateOpen(false)
      resetCreateForm()
      toast({ title: 'Order Created', description: 'Order recorded with calculated total.' })
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create order.',
        variant: 'destructive',
      })
    },
  })

  // Update order status
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}`, { orderStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast({ title: 'Status Updated' })
    },
  })

  const resetCreateForm = () => {
    setOrderNumber(generateAutoOrderNumber())
    setCustomerName('')
    setCustomerEmail('')
    setProductName('')
    setProductCode('')
    setProductSku('')
    setQuantity(1)
    setPricePerOrder('')
    setTotalAmount('')
    setPriceNotDecided(false)
    setIsEstimated(false)
  }

  const openCreateModal = () => {
    resetCreateForm()
    if (brands && brands.length > 0 && !brandId) {
      setBrandId(brands[0].id)
    }
    setIsCreateOpen(true)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!brandId && brands?.length) {
      toast({ title: 'Brand Required', description: 'Please select a brand.', variant: 'destructive' })
      return
    }

    createOrder.mutate({
      businessId: currentBusinessId,
      brandId: brandId || brands?.[0]?.id,
      orderNumber,
      customerName,
      customerEmail,
      productName: productName || 'Commercial Order Item',
      sku: productSku || 'N/A',
      productCode: productCode || 'N/A',
      quantity,
      pricePerOrder: priceNotDecided ? 0 : parseFloat(pricePerOrder) || 0,
      totalAmount: priceNotDecided ? 0 : parseFloat(totalAmount) || 0,
      priceNotDecided,
      isEstimated,
      currency,
      orderDate: new Date().toISOString(),
    })
  }

  const orders = ordersData?.orders || []
  const filteredOrders = orders.filter((o: any) => {
    const oNum = (o.orderNumber || o.externalOrderReference || '').toLowerCase()
    const cName = (o.customerName || '').toLowerCase()
    const bName = (o.brand?.brandName || o.brand?.name || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return oNum.includes(query) || cName.includes(query) || bName.includes(query)
  })

  const brandList = brands || []

  // Checkbox Selection Logic
  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o: any) => selectedOrderIds.includes(o.id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(filteredOrders.map((o: any) => o.id))
    }
  }

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const openSingleReceipt = (order: any) => {
    setReceiptOrders([order])
    setIsManualReceiptMode(false)
    setIsReceiptModalOpen(true)
  }

  const openBatchReceipts = () => {
    const selectedOrders = orders.filter((o: any) => selectedOrderIds.includes(o.id))
    if (!selectedOrders.length) {
      toast({ title: 'Select Orders', description: 'Please check at least one order.', variant: 'destructive' })
      return
    }
    setReceiptOrders(selectedOrders)
    setIsManualReceiptMode(false)
    setIsReceiptModalOpen(true)
  }

  const openManualReceiptGenerator = () => {
    setReceiptOrders([])
    setIsManualReceiptMode(true)
    setIsReceiptModalOpen(true)
  }

  return (
    <OwnerLayout title="Orders Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orders & Inflow</h1>
            <p className="text-sm text-muted-foreground">
              Manage client orders, calculate unit pricing, and generate genuine commercial tax receipts with presets
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              disabled={selectedOrderIds.length === 0}
              onClick={openBatchReceipts}
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Receipt className="h-4 w-4" /> Receipts ({selectedOrderIds.length})
            </Button>
            <Button
              variant="outline"
              onClick={openManualReceiptGenerator}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10 shadow-sm"
            >
              <FileText className="h-4 w-4" /> Generate Custom Receipt
            </Button>
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="h-4 w-4" /> Record Order
            </Button>
          </div>
        </div>

        {/* Selected Orders Floating Action Toolbar */}
        {selectedOrderIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between p-3.5 bg-primary/10 border border-primary/25 rounded-xl gap-3 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="h-6 px-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {selectedOrderIds.length}
              </span>
              <span className="text-sm font-semibold text-foreground">
                Order{selectedOrderIds.length > 1 ? 's' : ''} Selected
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                • Ready for batch tax invoice generation, download, or email dispatch
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={openBatchReceipts}
                className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Receipt className="h-4 w-4" /> Generate & Preview Receipts
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedOrderIds([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order #, customer, brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PLACED">Placed</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="text-xs text-muted-foreground">
            Total Orders: <strong>{filteredOrders.length}</strong>
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary cursor-pointer"
                      title="Select / Deselect All Orders"
                    />
                  </th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">SKU / Code</th>
                  <th className="py-3 px-4">Orders & Rate</th>
                  <th className="py-3 px-4">Total Amount (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      No orders found. Click "Record Order" or "Generate Custom Receipt" to begin.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order: any) => {
                    const isSelected = selectedOrderIds.includes(order.id)
                    const bName = order.brand?.brandName || order.brand?.name || 'General'
                    const pSku = order.product?.sku && order.product.sku !== 'N/A' ? order.product.sku : 'N/A'
                    const pCode = order.product?.productCode && order.product.productCode !== 'N/A' ? order.product.productCode : 'N/A'
                    const qty = order.quantity || 1
                    const pRate = order.pricePerOrder ? Number(order.pricePerOrder) : null

                    return (
                      <tr
                        key={order.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(order.id)}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{bName}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">
                            {order.customerName || 'Valued Customer'}
                          </div>
                          {order.customerEmail && (
                            <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          <div className="text-foreground">SKU: <span className="font-semibold">{pSku}</span></div>
                          <div className="text-muted-foreground text-[11px]">Code: {pCode}</div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="font-semibold text-foreground">
                            {qty} order{qty > 1 ? 's' : ''}
                          </div>
                          <div className="text-muted-foreground font-mono text-[11px]">
                            {order.priceNotDecided ? (
                              <span className="text-amber-500 font-medium">Pending Quote</span>
                            ) : pRate ? (
                              `₹${pRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/order`
                            ) : (
                              'Calculated'
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {order.priceNotDecided ? (
                            <Badge variant="warning" className="text-[11px]">
                              Price Not Yet Decided
                            </Badge>
                          ) : (
                            <div>
                              <span>
                                ₹{Number(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              {order.isEstimated && (
                                <span className="ml-1 text-[10px] text-amber-500 font-bold">(Est.)</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              order.status === 'COMPLETED'
                                ? 'success'
                                : order.status === 'PROCESSING'
                                ? 'info'
                                : order.status === 'PLACED'
                                ? 'secondary'
                                : 'warning'
                            }
                          >
                            {order.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(order.orderDate || order.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSingleReceipt(order)}
                              className="h-8 px-2.5 gap-1.5 text-xs text-primary border-primary/20 hover:bg-primary/10 shadow-sm"
                              title="Generate & View Receipt"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              Receipt
                            </Button>

                            <select
                              className="h-8 rounded border border-input bg-background px-2 text-xs"
                              value={order.status}
                              onChange={(e) =>
                                updateStatus.mutate({ id: order.id, status: e.target.value })
                              }
                            >
                              <option value="PLACED">Placed</option>
                              <option value="PROCESSING">Processing</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Record Order Modal with Pricing Calculations & Auto Order ID */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Record New Order"
          description="Enter order specifications with automatic ID, SKU, and unit pricing calculations"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Brand *</label>
              <select
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
              >
                <option value="">Select Brand</option>
                {brandList.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.brandName || b.name} ({b.brandCode || b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground block">Order # (Auto)</label>
                  <button
                    type="button"
                    onClick={() => setOrderNumber(generateAutoOrderNumber())}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Regenerate
                  </button>
                </div>
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Product Name</label>
                <Input
                  placeholder="e.g. Compression Activewear"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Product Code</label>
                <Input
                  placeholder="Leave blank for N/A"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                />
                <span className="text-[10px] text-muted-foreground">Shows N/A on receipt if blank</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Product SKU</label>
                <Input
                  placeholder="Leave blank for N/A"
                  value={productSku}
                  onChange={(e) => setProductSku(e.target.value)}
                />
                <span className="text-[10px] text-muted-foreground">Shows N/A on receipt if blank</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Customer Name</label>
                <Input
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Customer Email</label>
                <Input
                  type="email"
                  placeholder="customer@domain.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Price Per Order and Calculation Box */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Calculator className="h-3.5 w-3.5 text-primary" />
                Number of Orders & Rate Calculation
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Number of Orders *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
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
                    disabled={priceNotDecided}
                    placeholder="0.00"
                    value={pricePerOrder}
                    onChange={(e) => handlePricePerOrderChange(e.target.value)}
                    className={`h-8 text-xs font-mono font-bold ${
                      priceNotDecided ? 'opacity-40' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Calculated Total (₹) *
                  </label>
                  <Input
                    disabled={priceNotDecided}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className={`h-8 text-xs font-mono font-bold ${
                      priceNotDecided ? 'opacity-40' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={priceNotDecided}
                    onChange={(e) => {
                      setPriceNotDecided(e.target.checked)
                      if (e.target.checked) {
                        setIsEstimated(false)
                        setTotalAmount('')
                      }
                    }}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
                  />
                  <span>Price not yet decided (Mark as Quote Pending)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    disabled={priceNotDecided}
                    checked={isEstimated}
                    onChange={(e) => setIsEstimated(e.target.checked)}
                    className={`h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary ${
                      priceNotDecided ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  />
                  <span>Calculate as Estimated Price</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOrder.isPending} className="gap-2">
                {createOrder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Record Order
              </Button>
            </div>
          </form>
        </Modal>

        {/* Dedicated Receipt Generator & Preset Modal */}
        <OrderReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          orders={receiptOrders}
          initialManualMode={isManualReceiptMode}
          availableBrands={brandList}
          onOrderSaved={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
        />
      </div>
    </OwnerLayout>
  )
}
