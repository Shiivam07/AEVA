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
  Package,
  Layers,
  CheckSquare,
  FileSpreadsheet,
  Globe,
  Plus,
  Search,
  ExternalLink,
  Shield,
  Loader2,
} from 'lucide-react'
import api from '@/lib/api'

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'products' | 'accounts' | 'tasks'>('products')

  // Product modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [productName, setProductName] = useState('')
  const [productCode, setProductCode] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')

  // Account modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [platformName, setPlatformName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountIdentifier, setAccountIdentifier] = useState('')

  // Fetch brand details
  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ['brand', id],
    queryFn: () => api.get(`/brands/${id}`).then((r) => r.data.data),
    enabled: !!id,
  })

  // Fetch brand products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['brand-products', id],
    queryFn: () => api.get(`/products?brandId=${id}`).then((r) => r.data.data),
    enabled: !!id,
  })

  // Fetch ordering accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['brand-accounts', id],
    queryFn: () => api.get(`/ordering-ids?brandId=${id}`).then((r) => r.data.data),
    enabled: !!id,
  })

  // Fetch brand tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['brand-tasks', id],
    queryFn: () => api.get(`/tasks?brandId=${id}`).then((r) => r.data.data),
    enabled: !!id,
  })

  // Create Product mutation
  const createProduct = useMutation({
    mutationFn: (data: any) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-products', id] })
      setIsProductModalOpen(false)
      setProductName('')
      setProductCode('')
      setSku('')
      setCategory('')
      toast({ title: 'Product Added' })
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' })
    },
  })

  // Create Ordering Account mutation
  const createAccount = useMutation({
    mutationFn: (data: any) => api.post('/ordering-ids', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-accounts', id] })
      setIsAccountModalOpen(false)
      setPlatformName('')
      setAccountName('')
      setAccountIdentifier('')
      toast({ title: 'Ordering Account Registered' })
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' })
    },
  })

  if (brandLoading) {
    return (
      <OwnerLayout title="Brand Details">
        <div className="p-12 text-center text-muted-foreground">Loading brand details...</div>
      </OwnerLayout>
    )
  }

  if (!brand) {
    return (
      <OwnerLayout title="Brand Details">
        <div className="p-12 text-center">Brand not found</div>
      </OwnerLayout>
    )
  }

  const products = productsData?.products || []
  const accounts = accountsData || []
  const tasks = tasksData?.tasks || []

  const brandName = brand?.brandName || brand?.name || 'Brand'
  const brandCode = brand?.brandCode || brand?.code || brandName.slice(0, 3).toUpperCase()

  return (
    <OwnerLayout title={brandName}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          to="/brands"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Brands
        </Link>

        {/* Brand Banner Card */}
        <Card className="overflow-hidden">
          <div className="h-3 w-full" style={{ backgroundColor: brand?.color || '#6366f1' }} />
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-md flex-shrink-0"
                style={{ backgroundColor: brand?.color || '#6366f1' }}
              >
                {brandCode.slice(0, 4)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{brandName}</h1>
                  <Badge variant="outline" className="font-mono">{brandCode}</Badge>
                  <Badge variant="success">{brand?.status || 'ACTIVE'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  {brand?.description || 'No description provided.'}
                </p>
                {brand.website && (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <Globe className="h-3 w-3" /> {brand.website}
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => setIsProductModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Product
              </Button>
              <Button variant="outline" onClick={() => setIsAccountModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Account ID
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Controls */}
        <div className="border-b border-border flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'products'
                ? 'text-primary font-semibold border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'accounts'
                ? 'text-primary font-semibold border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ordering Accounts / IDs ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'tasks'
                ? 'text-primary font-semibold border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Operational Tasks ({tasks.length})
          </button>
        </div>

        {/* Tab 1: Products */}
        {activeTab === 'products' && (
          <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Products Catalog</CardTitle>
                <CardDescription>Items managed and sold under {brandName}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsProductModalOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> New Product
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Product Code / SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {productsLoading ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Loading products...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No products added for this brand yet.</td></tr>
                  ) : (
                    products.map((p: any) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold text-foreground">{p.productName}</td>
                        <td className="py-3 px-4 font-mono text-xs">{p.productCode || p.sku || '—'}</td>
                        <td className="py-3 px-4"><Badge variant="outline">{p.category || 'General'}</Badge></td>
                        <td className="py-3 px-4"><Badge variant="success">{p.status}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Ordering Accounts */}
        {activeTab === 'accounts' && (
          <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Ordering Platform Accounts</CardTitle>
                <CardDescription>Accounts, retailer portals, and buyer IDs tied to this brand</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsAccountModalOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> New Account
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Platform</th>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Account Identifier / ID</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accountsLoading ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Loading accounts...</td></tr>
                  ) : accounts.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No ordering accounts registered yet.</td></tr>
                  ) : (
                    accounts.map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold text-foreground">{acc.platformName}</td>
                        <td className="py-3 px-4">{acc.accountName}</td>
                        <td className="py-3 px-4 font-mono text-xs">{acc.accountIdentifier}</td>
                        <td className="py-3 px-4"><Badge variant="success">{acc.status}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Tasks */}
        {activeTab === 'tasks' && (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Brand Tasks</CardTitle>
              <CardDescription>Operational and fulfillment tasks for {brandName}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Task Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasksLoading ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Loading tasks...</td></tr>
                  ) : tasks.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No tasks registered for this brand.</td></tr>
                  ) : (
                    tasks.map((t: any) => (
                      <tr key={t.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold text-foreground">{t.title}</td>
                        <td className="py-3 px-4 text-xs">{t.taskType?.replace(/_/g, ' ')}</td>
                        <td className="py-3 px-4"><Badge variant="outline">{t.priority}</Badge></td>
                        <td className="py-3 px-4"><Badge variant="secondary">{t.status}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Add Product Modal */}
        <Modal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title={`Add Product to ${brandName}`}
          description="Register a new product in this brand's catalog"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createProduct.mutate({
                brandId: id,
                productName,
                productCode,
                sku,
                category,
              })
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Product Name *</label>
              <Input
                required
                placeholder="e.g. Classic Cotton Hoodie"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Product Code</label>
                <Input
                  placeholder="e.g. CCH-01"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">SKU</label>
                <Input
                  placeholder="e.g. APX-HOOD-BLK"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Category</label>
              <Input
                placeholder="e.g. Apparel, Electronics, Home"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProduct.isPending}>
                Save Product
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add Ordering Account Modal */}
        <Modal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          title="Add Ordering Account / ID"
          description="Register a portal account or buyer ID for this brand"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createAccount.mutate({
                brandId: id,
                platformName,
                accountName,
                accountIdentifier,
              })
            }}
            className="space-y-4"
            autoComplete="off"
          >
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Platform Name *</label>
              <Input
                required
                autoComplete="off"
                placeholder="e.g. Amazon, Shopify, Wholesale Portal"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Account Name *</label>
              <Input
                required
                autoComplete="off"
                placeholder="e.g. North America Store"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Account Identifier / ID *</label>
              <Input
                required
                autoComplete="off"
                placeholder="e.g. ACT-984210"
                value={accountIdentifier}
                onChange={(e) => setAccountIdentifier(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAccountModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAccount.isPending}>
                Save Account
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </OwnerLayout>
  )
}
