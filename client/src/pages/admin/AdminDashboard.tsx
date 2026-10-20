import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/hooks/useToast'
import {
  ShieldAlert,
  Users,
  Building2,
  Activity,
  IndianRupee,
  Search,
  CheckCircle2,
  XCircle,
  LogOut,
  RefreshCw,
  FileText,
  Sliders,
} from 'lucide-react'
import api from '@/lib/api'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'users' | 'businesses' | 'audit'>('users')
  const [searchQuery, setSearchQuery] = useState('')

  // Metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => api.get('/admin/metrics').then((r) => r.data.data),
  })

  // Users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data.data),
  })

  // Businesses
  const { data: businessesData, isLoading: businessesLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: () => api.get('/admin/businesses').then((r) => r.data.data),
  })

  // Audit Logs
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => api.get('/admin/audit-logs').then((r) => r.data.data),
  })

  // Toggle user status
  const toggleUserStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/users/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
      toast({ title: 'Status Updated', description: 'User account status updated successfully.' })
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update user status.',
        variant: 'destructive',
      })
    },
  })

  const users = usersData || []
  const businesses = businessesData || []
  const auditLogs = auditData || []

  const filteredUsers = users.filter(
    (u: any) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredBusinesses = businesses.filter(
    (b: any) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.owner?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-destructive flex items-center justify-center text-destructive-foreground font-bold">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight">AEVA Platform Master Admin</h1>
            <p className="text-xs text-muted-foreground">Platform Operations • Built with ❤️ by Shivam Chaurasia</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold">{user?.fullName}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Total Users</span>
                <Users className="h-4 w-4 text-primary" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {metricsLoading ? '...' : metricsData?.totalUsers ?? users.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {metricsData?.activeUsers ?? users.filter((u: any) => u.status === 'ACTIVE').length} active accounts
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Registered Businesses</span>
                <Building2 className="h-4 w-4 text-emerald-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {metricsLoading ? '...' : metricsData?.totalBusinesses ?? businesses.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Multi-brand enterprises registered
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Platform Tasks</span>
                <Activity className="h-4 w-4 text-indigo-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {metricsLoading ? '...' : metricsData?.totalTasks ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Across all businesses and brands
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Total Recorded Revenue</span>
                <IndianRupee className="h-4 w-4 text-amber-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                ₹{metricsLoading ? '...' : Number(metricsData?.totalRevenue || 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Gross sales tracked in platform
            </CardContent>
          </Card>
        </div>

        {/* Tab Controls & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 border border-border p-1 rounded-xl bg-muted/40 w-fit">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'users' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('businesses')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'businesses'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Businesses ({businesses.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'audit' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Audit Logs ({auditLogs.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Registered Users</CardTitle>
              <CardDescription>View, audit, activate or suspend user accounts</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{u.fullName}</div>
                          <div className="text-xs text-muted-foreground">{u.email} • @{u.username}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{u.accountType.replace(/_/g, ' ')}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={u.status === 'ACTIVE' ? 'success' : 'destructive'}>
                            {u.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {u.accountType !== 'PLATFORM_ADMIN' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toggleUserStatus.mutate({
                                  id: u.id,
                                  status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                })
                              }
                              disabled={toggleUserStatus.isPending}
                            >
                              {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
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

        {activeTab === 'businesses' && (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Platform Businesses</CardTitle>
              <CardDescription>Businesses registered and their owners</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Business Name</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Currency</th>
                    <th className="py-3 px-4">Brands</th>
                    <th className="py-3 px-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {businessesLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Loading businesses...
                      </td>
                    </tr>
                  ) : filteredBusinesses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No businesses found
                      </td>
                    </tr>
                  ) : (
                    filteredBusinesses.map((b: any) => (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{b.name}</div>
                          <div className="text-xs text-muted-foreground">{b.industry || 'General Business'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium">{b.owner?.fullName}</div>
                          <div className="text-xs text-muted-foreground">{b.owner?.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{b.currency || 'INR'}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          {b.brands?.length || b._count?.brands || 0}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'audit' && (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">System Audit Logs</CardTitle>
              <CardDescription>Security and administrative action event trail</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        Loading audit trail...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No audit events recorded yet
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {log.user ? `${log.user.fullName} (${log.user.email})` : 'System'}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t bg-card text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
        <div><strong>AEVA</strong> Master Operations Console</div>
        <div>Made with <span className="text-red-500">❤️</span> by <strong className="text-foreground font-semibold">Shivam Chaurasia</strong></div>
      </footer>
    </div>
  )
}
