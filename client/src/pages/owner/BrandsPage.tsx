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
  Tags,
  Plus,
  Search,
  ArrowRight,
  Globe,
  Package,
  CheckSquare,
  Loader2,
  Trash2,
} from 'lucide-react'
import api from '@/lib/api'

export default function BrandsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [industry, setIndustry] = useState('')
  const [website, setWebsite] = useState('')
  const [color, setColor] = useState('#6366f1')

  // Fetch businesses
  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get('/businesses').then((r) => r.data.data),
  })

  const currentBusinessId = businesses?.[0]?.id

  // Fetch brands
  const { data: brands, isLoading } = useQuery({
    queryKey: ['brands', currentBusinessId],
    queryFn: () => api.get(`/brands?businessId=${currentBusinessId}`).then((r) => r.data.data),
    enabled: !!currentBusinessId,
  })

  // Create brand
  const createBrand = useMutation({
    mutationFn: (data: any) => api.post('/brands', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      setIsCreateOpen(false)
      setName('')
      setCode('')
      setDescription('')
      setIndustry('')
      setWebsite('')
      toast({ title: 'Brand Created', description: 'New brand has been added to your business.' })
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create brand.',
        variant: 'destructive',
      })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusinessId) {
      toast({ title: 'No Business', description: 'Please register a business first.', variant: 'destructive' })
      return
    }
    createBrand.mutate({
      businessId: currentBusinessId,
      brandName: name,
      name,
      brandCode: code ? code.toUpperCase() : undefined,
      code: code ? code.toUpperCase() : undefined,
      description,
      industry,
      website,
      color,
    })
  }

  const brandList = brands || []
  const filteredBrands = brandList.filter((b: any) => {
    const bName = (b.brandName || b.name || '').toLowerCase()
    const bCode = (b.brandCode || b.code || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return bName.includes(query) || bCode.includes(query)
  })

  return (
    <OwnerLayout title="Brand Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Brands & Portfolios</h1>
            <p className="text-sm text-muted-foreground">
              Manage multi-brand identities, sheets, products, and operational accounts
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add New Brand
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search brands by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Brands Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading brands...</div>
        ) : filteredBrands.length === 0 ? (
          <div className="p-12 text-center border rounded-2xl border-dashed">
            <Tags className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-semibold text-foreground">No brands registered yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create your first brand to start tracking products, orders, and financials.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add First Brand
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand: any) => {
              const bName = brand.brandName || brand.name || 'Unnamed Brand'
              const bCode = brand.brandCode || brand.code || bName.slice(0, 3).toUpperCase()
              return (
                <Card key={brand.id} className="hover:border-primary/50 transition-all flex flex-col group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                          style={{ backgroundColor: brand.color || '#6366f1' }}
                        >
                          {bCode.slice(0, 4)}
                        </div>
                        <div>
                          <CardTitle className="text-base group-hover:text-primary transition-colors">
                            {bName}
                          </CardTitle>
                          <Badge variant="outline" className="text-[10px] mt-0.5 font-mono">
                            {bCode}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant={brand.status === 'ACTIVE' ? 'success' : 'outline'}>
                        {brand.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {brand.description || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-border text-center">
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {brand._count?.products ?? 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Products</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {brand._count?.tasks ?? 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Tasks</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {brand._count?.orders ?? 0}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Orders</div>
                      </div>
                    </div>

                  <div className="pt-2 flex items-center justify-between">
                    {brand.website ? (
                      <a
                        href={brand.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        <Globe className="h-3.5 w-3.5" /> Visit site
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No website</span>
                    )}

                    <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
                      <Link to={`/brands/${brand.id}`}>
                        Manage <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        )}

        {/* Create Brand Modal */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Brand"
          description="Add a new brand brand portfolio to your business"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Brand Name *</label>
                <Input
                  required
                  placeholder="e.g. Apex Apparel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Brand Code *</label>
                <Input
                  required
                  placeholder="e.g. APEX"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Brief summary of what this brand represents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Industry</label>
                <Input
                  placeholder="e.g. Fashion, Tech, F&B"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Theme Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 rounded cursor-pointer border border-input p-0.5 bg-background"
                  />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Website URL</label>
              <Input
                placeholder="https://brand.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBrand.isPending} className="gap-2">
                {createBrand.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Brand
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </OwnerLayout>
  )
}
