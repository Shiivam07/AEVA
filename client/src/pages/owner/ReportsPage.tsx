import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import OwnerLayout from '@/components/layout/OwnerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts'
import api from '@/lib/api'

export default function ReportsPage() {
  // Fetch businesses
  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get('/businesses').then((r) => r.data.data),
  })
  const currentBusinessId = businesses?.[0]?.id

  // Fetch reports data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports-summary', currentBusinessId],
    queryFn: () => api.get(`/reports/summary?businessId=${currentBusinessId}`).then((r) => r.data.data),
    enabled: !!currentBusinessId,
  })

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ['brands', currentBusinessId],
    queryFn: () => api.get(`/brands?businessId=${currentBusinessId}`).then((r) => r.data.data),
    enabled: !!currentBusinessId,
  })

  const brandPerformance = reportData?.brandPerformance || []
  const costDistribution = reportData?.costDistribution || [
    { name: 'Products', value: 40 },
    { name: 'Vendors', value: 25 },
    { name: 'Team', value: 20 },
    { name: 'Operations', value: 10 },
    { name: 'Fees', value: 5 },
  ]

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

  const handleExportCSV = () => {
    // Generate CSV string from brandPerformance
    const headers = 'Brand,Products,Tasks,Completed Tasks,Total Revenue,Net Profit\n'
    const rows = brandPerformance
      .map(
        (b: any) =>
          `"${b.name}",${b.products || 0},${b.tasks || 0},${b.completedTasks || 0},${b.revenue || 0},${b.profit || 0}`
      )
      .join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aeva-business-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <OwnerLayout title="Analytics & Executive Reports">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Executive Analytics & Reports</h1>
            <p className="text-sm text-muted-foreground">
              Cross-brand operational KPIs, profit margins, cost analysis, and data exports
            </p>
          </div>
          <Button onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV Report
          </Button>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Brand Revenue & Profit Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Brand Revenue vs Profit
              </CardTitle>
              <CardDescription>Comparison of revenue and realized profit by brand</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {brandPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandPerformance}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} />
                    <YAxis fontSize={12} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                      contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#6366f1" name="Revenue (₹)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="#10b981" name="Net Profit (₹)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Insufficient data to render chart
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Allocation Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieIcon className="h-5 w-5 text-indigo-500" />
                Expense Allocation Distribution
              </CardTitle>
              <CardDescription>Breakdown of organizational operating costs</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={costDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    fontSize={11}
                  >
                    {costDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']} />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Brand Performance Table */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Portfolio Brand Performance Table</CardTitle>
            <CardDescription>Comprehensive audit across all business brands</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Total Tasks</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4">Revenue</th>
                  <th className="py-3 px-4">Net Profit</th>
                  <th className="py-3 px-4">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      Calculating reports...
                    </td>
                  </tr>
                ) : brandPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No brands available to report.
                    </td>
                  </tr>
                ) : (
                  brandPerformance.map((brand: any) => {
                    const margin =
                      brand.revenue > 0 ? Math.round((brand.profit / brand.revenue) * 100) : 0
                    return (
                      <tr key={brand.id || brand.name} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {brand.name}
                        </td>
                        <td className="py-3 px-4">{brand.products || 0}</td>
                        <td className="py-3 px-4">{brand.tasks || 0}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{brand.completedTasks || 0}</Badge>
                        </td>
                        <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                          ₹{Number(brand.revenue || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          ₹{Number(brand.profit || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={margin > 20 ? 'success' : 'outline'}>{margin}%</Badge>
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
