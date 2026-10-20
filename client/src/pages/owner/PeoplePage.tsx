import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import OwnerLayout from '@/components/layout/OwnerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/hooks/useToast'
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Clock,
  Check,
  X,
  Search,
  Loader2,
  Briefcase,
} from 'lucide-react'
import api from '@/lib/api'

export default function PeoplePage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  // Form states
  const [recipient, setRecipient] = useState('')
  const [relationshipType, setRelationshipType] = useState('TEAM_MEMBER')
  const [message, setMessage] = useState('')

  // Fetch businesses
  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get('/businesses').then((r) => r.data.data),
  })
  const currentBusinessId = businesses?.[0]?.id

  // Fetch people
  const { data: peopleData, isLoading } = useQuery({
    queryKey: ['people', currentBusinessId],
    queryFn: () => api.get(`/people?businessId=${currentBusinessId}`).then((r) => r.data.data),
    enabled: !!currentBusinessId,
  })

  // Invite mutation
  const inviteMember = useMutation({
    mutationFn: (data: any) => api.post('/people/invite', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      setIsInviteOpen(false)
      setRecipient('')
      setMessage('')
      toast({
        title: 'Invitation Sent',
        description: res?.data?.message || 'Connection request dispatched.',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description:
          err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          'Failed to send invitation.',
        variant: 'destructive',
      })
    },
  })

  // Revoke membership mutation
  const revokeMembership = useMutation({
    mutationFn: (membershipId: string) => api.delete(`/people/${membershipId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      toast({ title: 'Access Revoked' })
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' })
    },
  })

  // Cancel/Withdraw pending request mutation
  const cancelInvite = useMutation({
    mutationFn: (requestId: string) => api.delete(`/people/requests/${requestId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      toast({ title: 'Invitation Withdrawn', description: 'The invitation has been cancelled.' })
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to cancel invitation.',
        variant: 'destructive',
      })
    },
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusinessId) return
    const trimmedRecipient = recipient.trim()
    if (!trimmedRecipient) {
      toast({
        title: 'Error',
        description: 'Please enter an email or username.',
        variant: 'destructive',
      })
      return
    }
    inviteMember.mutate({
      businessId: currentBusinessId,
      recipient: trimmedRecipient,
      recipientEmail: trimmedRecipient.includes('@') ? trimmedRecipient : undefined,
      recipientUsername: !trimmedRecipient.includes('@') ? trimmedRecipient : undefined,
      proposedRelationship: relationshipType,
      message: message.trim(),
    })
  }

  const memberships = Array.isArray(peopleData) ? peopleData : (peopleData?.memberships || [])
  const pendingRequests = Array.isArray(peopleData) ? [] : (peopleData?.pendingRequests || [])

  const filteredMembers = memberships.filter((m: any) => {
    const matchesRole =
      roleFilter === 'ALL' ||
      m.relationshipType === roleFilter ||
      (roleFilter === 'TEAM_MEMBER' && (m.relationshipType === 'EMPLOYEE' || m.relationshipType === 'TEAM_MEMBER'))
    const matchesSearch =
      m.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesRole && matchesSearch
  })

  return (
    <OwnerLayout title="People & Collaborators">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team, Vendors & Partners</h1>
            <p className="text-sm text-muted-foreground">
              Manage your network of employees, contractors, vendors, and profit-sharing co-partners
            </p>
          </div>
          <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Invite Collaborator
          </Button>
        </div>

        {/* Pending Requests Banner (if any) */}
        {pendingRequests.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Clock className="h-4 w-4" />
                Pending Connection Requests ({pendingRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/60">
              {pendingRequests.map((req: any) => (
                <div key={req.id} className="p-3 text-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {req.recipient?.fullName || req.recipient?.username || req.recipientEmail || 'User'}
                    </span>
                    {(req.recipient?.email || req.recipient?.username) && (
                      <span className="text-muted-foreground">
                        ({req.recipient?.email || `@${req.recipient?.username}`})
                      </span>
                    )}
                    <span className="text-muted-foreground">invited as</span>
                    <Badge variant="outline" className="text-[10px]">
                      {req.proposedRelationship?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">Awaiting Response</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => cancelInvite.mutate(req.id)}
                      disabled={cancelInvite.isPending}
                    >
                      Withdraw
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="TEAM_MEMBER">Team Members</option>
              <option value="VENDOR">Vendors</option>
              <option value="CO_PARTNER">Co-Partners</option>
            </select>
          </div>

          <div className="text-xs text-muted-foreground">
            Total Members: <strong>{filteredMembers.length}</strong>
          </div>
        </div>

        {/* Members Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="py-3 px-4">Collaborator</th>
                  <th className="py-3 px-4">Relationship</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Loading team members...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No members found. Click "Invite Collaborator" to add team members.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m: any) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{m.user?.fullName}</div>
                        <div className="text-xs text-muted-foreground">@{m.user?.username}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            m.relationshipType === 'CO_PARTNER'
                              ? 'default'
                              : m.relationshipType === 'VENDOR'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {m.relationshipType.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        <div>{m.user?.email}</div>
                        {m.user?.phone && <div>{m.user?.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={m.status === 'ACTIVE' ? 'success' : 'destructive'}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => revokeMembership.mutate(m.id)}
                          disabled={revokeMembership.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Invite Collaborator Modal */}
        <Modal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          title="Invite Collaborator or Partner"
          description="Send an invitation to join your business operations"
        >
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Email or Username *
              </label>
              <Input
                required
                placeholder="colleague@domain.com or username"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Relationship / Role *
              </label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
              >
                <option value="TEAM_MEMBER">Employee / Team Member</option>
                <option value="VENDOR">Vendor / Supplier</option>
                <option value="CO_PARTNER">Co-Partner (Profit Participant)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Invitation Message
              </label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="We would like to invite you to collaborate on our operations..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMember.isPending} className="gap-2">
                {inviteMember.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </OwnerLayout>
  )
}
