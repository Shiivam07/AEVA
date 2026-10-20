import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import OwnerLayout from '@/components/layout/OwnerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { formatCurrency, formatDate, TASK_STATUS_COLORS, ORDER_STATUS_COLORS } from '@/lib/utils'
import {
  Tags, CheckSquare, ShoppingCart, IndianRupee, TrendingUp, Users,
  AlertTriangle, Plus, ArrowRight, Package
} from 'lucide-react'

function StatCard({ title, value, subtitle, icon: Icon, color }: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function CreateBusinessPanel() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await api.post('/businesses', { businessName: name })
      window.location.reload()
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create business')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OwnerLayout title="Dashboard">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Package className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Welcome to AEVA!</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Let's get started by creating your first business workspace.
        </p>
        <div className="w-full max-w-sm space-y-3">
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Business name…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <Button className="w-full" onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? 'Creating…' : 'Create Business Workspace'}
          </Button>
        </div>
      </div>
    </OwnerLayout>
  )
}

export default function OwnerDashboard() {
  const { user } = useAuth()

  const { data: businesses, isLoading: bizLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get('/businesses').then(r => r.data.data),
  })

  const currentBusiness = businesses?.[0]

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard', currentBusiness?.id],
    queryFn: () => api.get(`/businesses/${currentBusiness?.id}/dashboard`).then(r => r.data.data),
    enabled: !!currentBusiness?.id,
  })

  const isLoading = bizLoading || dashLoading

  if (!bizLoading && !currentBusiness) {
    return <CreateBusinessPanel />
  }

  const stats = dashboard || {}

  return (
    <OwnerLayout title="Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              Good {getTimeGreeting()}, {user?.fullName?.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentBusiness?.businessName} — here's your overview.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/brands"><Tags className="h-4 w-4" />Brands</Link>
            </Button>
            <Button asChild>
              <Link to="/tasks"><Plus className="h-4 w-4" />New Task</Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><div className="h-16 bg-muted rounded animate-pulse" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Active Brands" value={stats.activeBrandCount ?? 0} subtitle={`${stats.brandCount ?? 0} total`} icon={Tags} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
              <StatCard title="Active Tasks" value={stats.activeTaskCount ?? 0} subtitle={`${stats.overdueTaskCount ?? 0} overdue`} icon={CheckSquare} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
              <StatCard title="Orders in Progress" value={stats.activeOrderCount ?? 0} subtitle={`${stats.orderCount ?? 0} total`} icon={ShoppingCart} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
              <StatCard title="Team Members" value={stats.memberCount ?? 0} subtitle="Active" icon={Users} color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Order Value" value={formatCurrency(stats.financials?.totalOrderValue)} icon={IndianRupee} color="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" />
              <StatCard title="Revenue Recorded" value={formatCurrency(stats.financials?.totalRevenue)} icon={TrendingUp} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <StatCard title="Total Expenses" value={formatCurrency(stats.financials?.totalExpenses)} icon={IndianRupee} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
              <StatCard title="Pending Distributions" value={formatCurrency(stats.financials?.pendingDistributions)} subtitle="To partners" icon={AlertTriangle} color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent Tasks</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/tasks">View all <ArrowRight className="h-3 w-3" /></Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {stats.recentTasks?.length > 0 ? (
                    <div className="divide-y">
                      {stats.recentTasks.map((task: any) => (
                        <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-muted-foreground">{task.taskCode}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS_COLORS[task.status]}`}>
                                {task.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate mt-0.5">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{task.brand?.brandName} · {task.dueDate ? formatDate(task.dueDate) : 'No deadline'}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No tasks yet. <Link to="/tasks" className="text-primary hover:underline">Create one</Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent Orders</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/orders">View all <ArrowRight className="h-3 w-3" /></Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {stats.recentOrders?.length > 0 ? (
                    <div className="divide-y">
                      {stats.recentOrders.map((order: any) => (
                        <div key={order.id} className="flex items-center gap-3 px-6 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[order.orderStatus]}`}>
                                {order.orderStatus}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate mt-0.5">{order.product?.productName || 'No product'}</p>
                            <p className="text-xs text-muted-foreground">{order.brand?.brandName} · {formatDate(order.orderDate)}</p>
                          </div>
                          <p className="text-sm font-semibold flex-shrink-0">{formatCurrency(order.expectedAmount)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No orders yet. <Link to="/orders" className="text-primary hover:underline">Record one</Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </OwnerLayout>
  )
}
