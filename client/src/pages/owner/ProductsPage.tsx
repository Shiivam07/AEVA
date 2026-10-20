import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import OwnerLayout from '@/components/layout/OwnerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/hooks/useToast'
import { Package, Plus, Search, Filter, Loader2, ArrowUpDown } from 'lucide-react'
import api from '@/lib/api'

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrandId, setSelectedBrandId] = useState<string>('ALL')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form states
  const [brandId, setBrandId] = useState('')
  const [productName, setProductName] = useState('')
  const [productCode, setProductCode] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

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

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['all-products', selectedBrandId],
    queryFn: () => {
      const url = selectedBrandId !== 'ALL' ? `/products?brandId=${selectedBrandId}` : '/products'
      return api.get(url).then((r) => r.data.data)
    },
  })

  // Create product
  const createProduct = useMutation({
    mutationFn: (data: any) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-products'] })
      setIsCreateOpen(false)
      setProductName('')
      setProductCode('')
      setSku('')
      setCategory('')
      setDescription('')
      toast({ title: 'Product Created', description: 'Product added to catalog successfully.' })
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create product.',
        variant: 'destructive',
      })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!brandId) {
      toast({ title: 'Brand Required', description: 'Please select a brand.', variant: 'destructive' })
      return
    }
    createProduct.mutate({
      brandId,
      productName,
      productCode,
      sku,
      category,
      description,
    })
  }

  const products = productsData?.products || []
  const filteredProducts = products.filter((p: any) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const brandList = brands || []

  return (
    <OwnerLayout title="Products Catalog">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products & Inventory</h1>
            <p className="text-sm text-muted-foreground">
              Maintain product catalogs, SKUs, and specifications across all brands
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products, SKUs, codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {brandList.length > 0 && (
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
              >
                <option value="ALL">All Brands</option>
                {brandList.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredProducts.length}</strong> items
          </div>
        </div>

        {/* Products Table Card */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Code / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No products found. Click "Add Product" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{p.productName}</div>
                        {p.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-semibold">
                          {p.brand?.name || 'General'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {p.productCode || p.sku || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs">{p.category || 'Standard'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="success">{p.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Create Product Modal */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Add New Product"
          description="Register a product to a specific brand"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Brand *</label>
              <select
                required
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
              >
                <option value="">Select a brand...</option>
                {brandList.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Product Name *</label>
              <Input
                required
                placeholder="e.g. Ultra Comfort Crewneck"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Product Code</label>
                <Input
                  placeholder="e.g. PRD-001"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">SKU</label>
                <Input
                  placeholder="e.g. UCC-BLK-L"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Category</label>
              <Input
                placeholder="e.g. Apparel, Footwear, Accessories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Product specifications, materials, or features..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProduct.isPending} className="gap-2">
                {createProduct.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Product
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </OwnerLayout>
  )
}
