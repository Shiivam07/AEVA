import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import OwnerLayout from '@/components/layout/OwnerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/hooks/useToast'
import {
  PieChart,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Search,
  Filter,
  CreditCard,
  Loader2,
} from 'lucide-react'
import api from '@/lib/api'

export default function DistributionsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Payment modal state
  const [selectedDist, setSelectedDist] = useState<any | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER')
  const [transactionRef, setTransactionRef] = useState('')

  // Fetch businesses
  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get('/businesses').then((r) => r.data.data),
  })
  const currentBusinessId = businesses?.[0]?.id

  // Fetch distributions
  const { data: distributionsData, isLoading } = useQuery({
    queryKey: ['distributions', currentBusinessId],
    queryFn: () =>
      api.get(`/distributions?businessId=${currentBusinessId}`).then((r) => r.data.data),
    enabled: !!currentBusinessId,
  })

  // Record payment mutation
  const recordPayment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/financials/distribution/${id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions'] })
      setSelectedDist(null)
      setPaymentAmount('')
      setTransactionRef('')
      toast({ title: 'Payment Recorded', description: 'Distribution payment successfully recorded.' })
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to record payment.',
        variant: 'destructive',
      })
    },
  })

  const distributions: any[] = Array.isArray(distributionsData)
    ? distributionsData
    : distributionsData?.distributions || []

  const totalAllocated = distributions.reduce(
    (sum, d) => sum + Number(d.calculatedAmount || 0),
    0
  )
  const totalPaid = distributions.reduce((sum, d) => sum + Number(d.amountPaid || 0), 0)
  const totalOutstanding = distributions.reduce(
    (sum, d) => sum + Number(d.outstandingAmount || 0),
    0
  )

  const filteredDistributions = distributions.filter((d: any) => {
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter
    const partnerName = d.participant?.fullName || d.user?.fullName || ''
    const taskTitle = d.task?.title || ''
    const brandName = d.task?.brand?.brandName || d.task?.brand?.name || ''
    const matchesSearch =
      partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brandName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDist) return
    recordPayment.mutate({
      id: selectedDist.id,
      data: {
        amount: parseFloat(paymentAmount),
        paymentMethod,
        transactionReference: transactionRef,
      },
    })
  }

  return (
    <OwnerLayout title="Profit Distributions">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Partner Profit Distributions</h1>
            <p className="text-sm text-muted-foreground">
              Monitor stakeholder allocations, commission percentages, outstanding balances, and disbursed payouts
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Total Allocated</span>
                <PieChart className="h-4 w-4 text-primary" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                ₹{totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Total profit share entitlement computed
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Total Disbursed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Successfully paid to partners
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Outstanding Payables</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Remaining balances to be settled
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search partner, task, brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Fully Paid</option>
            </select>
          </div>

          <div className="text-xs text-muted-foreground">
            Distributions: <strong>{filteredDistributions.length}</strong>
          </div>
        </div>

        {/* Distributions Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="py-3 px-4">Beneficiary</th>
                  <th className="py-3 px-4">Task & Brand</th>
                  <th className="py-3 px-4">Basis</th>
                  <th className="py-3 px-4">Entitled</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Outstanding</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      Loading profit distributions...
                    </td>
                  </tr>
                ) : filteredDistributions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No profit distributions recorded. Configure distributions on individual tasks.
                    </td>
                  </tr>
                ) : (
                  filteredDistributions.map((dist: any) => (
                    <tr key={dist.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">
                          {dist.participant?.fullName || dist.user?.fullName || 'Stakeholder'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @{dist.participant?.username || dist.user?.username || 'partner'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/tasks/${dist.task?.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors text-sm"
                        >
                          {dist.task?.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          Brand: {dist.task?.brand?.brandName || dist.task?.brand?.name || 'General'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        {dist.distributionBasis?.replace(/_/g, ' ')}
                        {dist.participationPercentage ? ` (${dist.participationPercentage}%)` : ''}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        ₹{Number(dist.calculatedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                        ₹{Number(dist.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-bold text-destructive">
                        ₹{Number(dist.outstandingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            dist.status === 'PAID'
                              ? 'success'
                              : dist.status === 'PARTIALLY_PAID'
                              ? 'info'
                              : 'warning'
                          }
                        >
                          {dist.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {dist.status !== 'PAID' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDist(dist)
                              setPaymentAmount(dist.outstandingAmount?.toString() || '')
                            }}
                          >
                            Pay Balance
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Record Payout Modal */}
        <Modal
          isOpen={!!selectedDist}
          onClose={() => setSelectedDist(null)}
          title={`Disburse Payout to ${selectedDist?.participant?.fullName || selectedDist?.user?.fullName || 'Partner'}`}
          description={`Task: ${selectedDist?.task?.title} • Outstanding: ₹${Number(selectedDist?.outstandingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Disbursement Amount (₹) *
              </label>
              <Input
                required
                type="number"
                step="0.01"
                max={selectedDist?.outstandingAmount || undefined}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Payment Channel
              </label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="BANK_TRANSFER">Bank Wire / ACH</option>
                <option value="STRIPE">Stripe / Card</option>
                <option value="PAYPAL">PayPal</option>
                <option value="CASH">Cash / Direct</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Transaction Reference / Confirmation #
              </label>
              <Input
                placeholder="e.g. ACH-908123 or Check #104"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSelectedDist(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isPending} className="gap-2">
                {recordPayment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Disbursement
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </OwnerLayout>
  )
}
