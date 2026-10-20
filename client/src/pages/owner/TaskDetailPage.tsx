import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import OwnerLayout from '@/components/layout/OwnerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/hooks/useToast'
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  IndianRupee,
  MessageSquare,
  Send,
  PieChart,
  User,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import api from '@/lib/api'

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'details' | 'financials' | 'distributions' | 'comments'>('financials')

  // Financial form states
  const [expectedRevenue, setExpectedRevenue] = useState('')
  const [actualRevenue, setActualRevenue] = useState('')
  const [productCost, setProductCost] = useState('')
  const [vendorCost, setVendorCost] = useState('')
  const [teamPayment, setTeamPayment] = useState('')
  const [operationalExpenses, setOperationalExpenses] = useState('')
  const [fees, setFees] = useState('')
  const [refunds, setRefunds] = useState('')

  // New comment
  const [newComment, setNewComment] = useState('')

  // Distribution payment modal
  const [paymentDistId, setPaymentDistId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER')
  const [paymentRef, setPaymentRef] = useState('')

  // Fetch task
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get(`/tasks/${id}`).then((r) => r.data.data),
    enabled: !!id,
  })

  // Fetch financials
  const { data: financialsData, isLoading: finLoading } = useQuery({
    queryKey: ['task-financials', id],
    queryFn: () => api.get(`/financials/task/${id}`).then((r) => r.data.data),
    enabled: !!id,
  })

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      toast({ title: 'Status Updated' })
    },
  })

  // Save financials mutation
  const saveFinancials = useMutation({
    mutationFn: (data: any) => api.post(`/financials/task/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-financials', id] })
      toast({ title: 'Financials Saved', description: 'Task budget, revenues, and costs updated.' })
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' })
    },
  })

  // Add comment
  const addComment = useMutation({
    mutationFn: (commentText: string) => api.post(`/tasks/${id}/comments`, { commentText }),
    onSuccess: () => {
      setNewComment('')
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      toast({ title: 'Comment Posted' })
    },
  })

  // Record payment
  const recordPayment = useMutation({
    mutationFn: (data: any) => api.post(`/financials/distribution/${paymentDistId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-financials', id] })
      setPaymentDistId(null)
      setPaymentAmount('')
      setPaymentRef('')
      toast({ title: 'Payment Recorded', description: 'Partner distribution payment registered.' })
    },
    onError: (err: any) => {
      toast({ title: 'Payment Failed', description: err.response?.data?.message, variant: 'destructive' })
    },
  })

  if (taskLoading) {
    return (
      <OwnerLayout title="Task Details">
        <div className="p-12 text-center text-muted-foreground">Loading task details...</div>
      </OwnerLayout>
    )
  }

  if (!task) {
    return (
      <OwnerLayout title="Task Details">
        <div className="p-12 text-center">Task not found</div>
      </OwnerLayout>
    )
  }

  const fin = financialsData?.financials
  const distributions = financialsData?.distributions || []

  // Prepopulate form if available
  const handleSaveFin = (e: React.FormEvent) => {
    e.preventDefault()
    saveFinancials.mutate({
      expectedRevenue: parseFloat(expectedRevenue || fin?.expectedRevenue || '0'),
      actualRevenue: parseFloat(actualRevenue || fin?.actualRevenue || '0'),
      productCost: parseFloat(productCost || fin?.productCost || '0'),
      vendorCost: parseFloat(vendorCost || fin?.vendorCost || '0'),
      teamPayment: parseFloat(teamPayment || fin?.teamPayment || '0'),
      operationalExpenses: parseFloat(operationalExpenses || fin?.operationalExpenses || '0'),
      fees: parseFloat(fees || fin?.fees || '0'),
      refundsOrAdjustments: parseFloat(refunds || fin?.refundsOrAdjustments || '0'),
    })
  }

  return (
    <OwnerLayout title={task.title}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <Link
          to="/tasks"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tasks
        </Link>

        {/* Header Summary Card */}
        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
                <Badge
                  variant={
                    task.status === 'COMPLETED'
                      ? 'success'
                      : task.status === 'IN_PROGRESS'
                      ? 'info'
                      : 'outline'
                  }
                >
                  {task.status.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline">{task.priority}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Brand: <strong className="text-foreground">{task.brand?.name || 'General'}</strong></span>
                <span>Type: {task.taskType?.replace(/_/g, ' ')}</span>
                {task.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                {task.assignees?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> Assignees:{' '}
                    {task.assignees.map((a: any) => a.user?.fullName).join(', ')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-muted-foreground">Status:</label>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm font-semibold shadow-sm"
                value={task.status}
                onChange={(e) => updateStatus.mutate(e.target.value)}
              >
                <option value="DRAFT">Draft</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Under Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="border-b border-border flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('financials')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'financials'
                ? 'text-primary font-semibold border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Financials & Profit Calculations
          </button>
          <button
            onClick={() => setActiveTab('distributions')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'distributions'
                ? 'text-primary font-semibold border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Distributions & Payouts ({distributions.length})
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'details'
                ? 'text-primary font-semibold border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Specifications & Details
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'comments'
                ? 'text-primary font-semibold border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Activity & Comments ({task.comments?.length || 0})
          </button>
        </div>

        {/* Tab: Financials */}
        {activeTab === 'financials' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-emerald-500" />
                    Task Financial Ledger
                  </CardTitle>
                  <CardDescription>
                    Record revenue, production, vendor, team, and operational fees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveFin} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Expected Revenue</label>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={fin?.expectedRevenue || ''}
                          onChange={(e) => setExpectedRevenue(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Actual Revenue *</label>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={fin?.actualRevenue || ''}
                          onChange={(e) => setActualRevenue(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Product / Material Cost</label>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={fin?.productCost || ''}
                          onChange={(e) => setProductCost(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Vendor Cost</label>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={fin?.vendorCost || ''}
                          onChange={(e) => setVendorCost(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Team Payments</label>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={fin?.teamPayment || ''}
                          onChange={(e) => setTeamPayment(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Operations</label>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={fin?.operationalExpenses || ''}
                          onChange={(e) => setOperationalExpenses(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Fees / Gateway</label>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={fin?.fees || ''}
                          onChange={(e) => setFees(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Refunds / Adjustments</label>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={fin?.refundsOrAdjustments || ''}
                          onChange={(e) => setRefunds(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button type="submit" disabled={saveFinancials.isPending} className="gap-2">
                        {saveFinancials.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save & Calculate Profit
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Calculations Summary Panel */}
            <div className="space-y-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Profit Calculations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Actual Revenue</span>
                    <span className="font-semibold text-foreground">
                      ₹{Number(fin?.actualRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Total Expenses</span>
                    <span className="font-semibold text-destructive">
                      -₹{(
                        Number(fin?.productCost || 0) +
                        Number(fin?.vendorCost || 0) +
                        Number(fin?.teamPayment || 0) +
                        Number(fin?.operationalExpenses || 0) +
                        Number(fin?.fees || 0)
                      ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Refunds / Adj</span>
                    <span className="font-semibold text-amber-500">
                      -₹{Number(fin?.refundsOrAdjustments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 text-base font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Net Profit</span>
                    <span>₹{Number(fin?.calculatedProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab: Distributions */}
        {activeTab === 'distributions' && (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Configured Distributions</CardTitle>
              <CardDescription>
                Profit and revenue allocations between business partners and collaborators
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Beneficiary</th>
                    <th className="py-3 px-4">Basis</th>
                    <th className="py-3 px-4">Percentage / Share</th>
                    <th className="py-3 px-4">Calculated Amount</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Outstanding</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {distributions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        No distributions configured for this task.
                      </td>
                    </tr>
                  ) : (
                    distributions.map((dist: any) => (
                      <tr key={dist.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {dist.user?.fullName || 'Partner'}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          {dist.distributionBasis.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-4">
                          {dist.participationPercentage ? `${dist.participationPercentage}%` : '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          ₹{Number(dist.calculatedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400">
                          ₹{Number(dist.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-bold text-destructive">
                          ₹{Number(dist.outstandingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={dist.status === 'PAID' ? 'success' : 'warning'}>
                            {dist.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {dist.status !== 'PAID' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPaymentDistId(dist.id)
                                setPaymentAmount(dist.outstandingAmount?.toString() || '')
                              }}
                            >
                              Record Payment
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
        )}

        {/* Tab: Details */}
        {activeTab === 'details' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</h4>
                <p className="text-sm text-foreground bg-muted/40 p-4 rounded-xl leading-relaxed whitespace-pre-wrap">
                  {task.description || 'No description provided.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab: Comments */}
        {activeTab === 'comments' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task Discussion & History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {task.comments?.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No comments yet.</p>
                ) : (
                  task.comments?.map((c: any) => (
                    <div key={c.id} className="bg-muted/40 p-4 rounded-xl text-sm space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{c.user?.fullName}</span>
                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-foreground">{c.commentText}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Type an update or comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newComment.trim()) {
                      addComment.mutate(newComment)
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newComment.trim()) addComment.mutate(newComment)
                  }}
                  disabled={addComment.isPending || !newComment.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Modal */}
        <Modal
          isOpen={!!paymentDistId}
          onClose={() => setPaymentDistId(null)}
          title="Record Payout / Distribution Payment"
          description="Register proof of payment disbursed to the participant"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              recordPayment.mutate({
                amount: parseFloat(paymentAmount),
                paymentMethod,
                transactionReference: paymentRef,
              })
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Payment Amount (₹) *</label>
              <Input
                required
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Payment Method</label>
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
              <label className="text-xs font-semibold text-foreground mb-1 block">Transaction Reference / Note</label>
              <Input
                placeholder="e.g. Wire Ref #8921-998"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentDistId(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                Save Payment
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </OwnerLayout>
  )
}
