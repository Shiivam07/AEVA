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
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  ArrowRight,
  User,
  Tag,
  Loader2,
} from 'lucide-react'
import api from '@/lib/api'

export default function TasksPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [brandId, setBrandId] = useState('')
  const [taskType, setTaskType] = useState('GENERAL_TASK')
  const [priority, setPriority] = useState('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

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

  // Fetch people (collaborators)
  const { data: peopleData } = useQuery({
    queryKey: ['people', currentBusinessId],
    queryFn: () => api.get(`/people?businessId=${currentBusinessId}`).then((r) => r.data.data),
    enabled: !!currentBusinessId,
  })

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, typeFilter],
    queryFn: () => {
      let params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (typeFilter !== 'ALL') params.append('taskType', typeFilter)
      return api.get(`/tasks?${params.toString()}`).then((r) => r.data.data)
    },
  })

  // Create task mutation
  const createTask = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setIsCreateOpen(false)
      setTitle('')
      setDescription('')
      setBrandId('')
      setDueDate('')
      setAssigneeId('')
      toast({ title: 'Task Created', description: 'New work item successfully registered.' })
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to create task.',
        variant: 'destructive',
      })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusinessId) {
      toast({ title: 'Business required', variant: 'destructive' })
      return
    }
    createTask.mutate({
      businessId: currentBusinessId,
      brandId: brandId || undefined,
      title,
      description,
      taskType,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      assigneeIds: assigneeId ? [assigneeId] : [],
    })
  }

  const tasks = tasksData?.tasks || []
  const filteredTasks = tasks.filter((t: any) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.brand?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const brandList = brands || []
  const members = Array.isArray(peopleData) ? peopleData : (peopleData?.memberships || [])

  return (
    <OwnerLayout title="Tasks & Workflows">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Work Management</h1>
            <p className="text-sm text-muted-foreground">
              Assign tasks, track fulfillment progress, and coordinate with collaborators
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Task
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="GENERAL_TASK">General</option>
              <option value="PRODUCT_SOURCING">Sourcing</option>
              <option value="ORDER_FULFILLMENT">Fulfillment</option>
              <option value="DAILY_TASK">Daily Task</option>
            </select>
          </div>

          <div className="text-xs text-muted-foreground">
            Total: <strong>{filteredTasks.length}</strong> tasks
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl border-dashed">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-semibold text-foreground">No tasks registered</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create a task to assign work or configure profit distributions.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Create Task
              </Button>
            </div>
          ) : (
            filteredTasks.map((task: any) => (
              <Card key={task.id} className="hover:border-primary/50 transition-all shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="font-semibold text-foreground text-base hover:text-primary transition-colors truncate"
                      >
                        {task.title}
                      </Link>
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
                      <Badge
                        variant={
                          task.priority === 'URGENT'
                            ? 'destructive'
                            : task.priority === 'HIGH'
                            ? 'warning'
                            : 'outline'
                        }
                      >
                        {task.priority}
                      </Badge>
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
                          <User className="h-3.5 w-3.5" /> {task.assignees.map((a: any) => a.user?.fullName).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
                    <Link to={`/tasks/${task.id}`}>
                      Details & Financials <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Task Modal */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Task"
          description="Define the operational task, assignees, and timeline"
          maxWidth="xl"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Title *</label>
              <Input
                required
                placeholder="e.g. Sourcing 500 units for Summer Launch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Detailed instructions, milestones, or requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Brand</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                >
                  <option value="">General (No Brand)</option>
                  {brandList.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Task Type</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                >
                  <option value="GENERAL_TASK">General Task</option>
                  <option value="PRODUCT_SOURCING">Product Sourcing</option>
                  <option value="ORDER_FULFILLMENT">Order Fulfillment</option>
                  <option value="DAILY_TASK">Daily Task</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Priority</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Assign Collaborator</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.fullName} ({m.relationshipType})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending} className="gap-2">
                {createTask.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Task
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </OwnerLayout>
  )
}
