import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import OwnerLayout from '@/components/layout/OwnerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IndianRupee,
  TrendingUp,
  CreditCard,
  PieChart,
  ArrowRight,
  Download,
  Calendar,
  Layers,
} from 'lucide-react'
import api from '@/lib/api'

export default function FinancialsPage() {
  // Fetch businesses
  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get('/businesses').then((r) => r.data.data),
  })
  const currentBusinessId = businesses?.[0]?.id

  // Fetch financial overview
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['financial-overview', currentBusinessId],
    queryFn: () => api.get(`/financials/overview?businessId=${currentBusinessId}`).then((r) => r.data.data),
    enabled: !!currentBusinessId,
  })

  // Fetch all tasks with financials
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data.data),
  })

  const fin = overviewData || {
    grossRevenue: 0,
    totalExpenses: 0,
    productCost: 0,
    vendorCost: 0,
    teamPayment: 0,
    operationalExpenses: 0,
    fees: 0,
    netProfit: 0,
  }

  const tasksWithFinancials = tasksData?.tasks || []
  const profitMargin =
    Number(fin.grossRevenue) > 0
      ? Math.round((Number(fin.netProfit) / Number(fin.grossRevenue)) * 100)
      : 0

  return (
    <OwnerLayout title="Financial Intelligence">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Business Financials & P&L</h1>
            <p className="text-sm text-muted-foreground">
              Real-time revenue, expense categorization, net operating profit, and margins
            </p>
          </div>
          <Button variant="outline" asChild className="gap-2">
            <Link to="/reports">
              <TrendingUp className="h-4 w-4" /> Comprehensive Reports
            </Link>
          </Button>
        </div>

        {/* Key Financial KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Gross Revenue</span>
                <IndianRupee className="h-4 w-4 text-emerald-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                ₹{Number(fin.grossRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Total sales across all brand activities
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Total Costs & Expenses</span>
                <CreditCard className="h-4 w-4 text-destructive" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-destructive">
                ₹{Number(fin.totalExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Production, vendor, operations & fees
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Net Operating Profit</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ₹{Number(fin.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Net distributable business surplus
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Net Profit Margin</span>
                <PieChart className="h-4 w-4 text-indigo-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {profitMargin}%
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Operating profitability ratio
            </CardContent>
          </Card>
        </div>

        {/* Expense Categorization Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost & Expense Allocation</CardTitle>
            <CardDescription>Breakdown by operational category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground">Product & Materials</div>
                <div className="text-lg font-bold text-foreground mt-1">
                  ₹{Number(fin.productCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground">Vendor Services</div>
                <div className="text-lg font-bold text-foreground mt-1">
                  ₹{Number(fin.vendorCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground">Team & Payroll</div>
                <div className="text-lg font-bold text-foreground mt-1">
                  ₹{Number(fin.teamPayment || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground">Operations</div>
                <div className="text-lg font-bold text-foreground mt-1">
                  ₹{Number(fin.operationalExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground">Gateway & Fees</div>
                <div className="text-lg font-bold text-foreground mt-1">
                  ₹{Number(fin.fees || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task-Level Financial Records */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Work & Task Financials</CardTitle>
            <CardDescription>Individual P&L calculated per operational work item</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Revenue</th>
                  <th className="py-3 px-4">Costs</th>
                  <th className="py-3 px-4">Net Profit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Loading financial records...
                    </td>
                  </tr>
                ) : tasksWithFinancials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No task financial records yet.
                    </td>
                  </tr>
                ) : (
                  tasksWithFinancials.map((task: any) => {
                    const taskFin = task.financials
                    const rev = Number(taskFin?.actualRevenue || 0)
                    const cost =
                      Number(taskFin?.productCost || 0) +
                      Number(taskFin?.vendorCost || 0) +
                      Number(taskFin?.teamPayment || 0) +
                      Number(taskFin?.operationalExpenses || 0) +
                      Number(taskFin?.fees || 0)
                    const profit = rev - cost

                    return (
                      <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {task.title}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{task.brand?.name || 'General'}</Badge>
                        </td>
                        <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                          ₹{rev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-destructive font-medium">
                          ₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          ₹{profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
                            <Link to={`/tasks/${task.id}`}>
                              Manage Financials <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  )
}
