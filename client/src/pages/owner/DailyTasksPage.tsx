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
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import api from '@/lib/api'
import { format, isToday, isPast, isFuture } from 'date-fns'

export default function DailyTasksPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('MEDIUM')

  // Fetch businesses
  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get('/businesses').then((r) => r.data.data),
  })
  const currentBusinessId = businesses?.[0]?.id

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data.data),
  })

  // Quick toggle status mutation
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast({ title: 'Task Updated' })
    },
  })

  // Quick create daily task
  const createDailyTask = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setIsCreateOpen(false)
      setTitle('')
      toast({ title: 'Daily Task Added' })
    },
  })

  const tasks = tasksData?.tasks || []

  const todayTasks = tasks.filter((t: any) => {
    if (!t.dueDate) return true
    const due = new Date(t.dueDate).toISOString().slice(0, 10)
    return due === selectedDate
  })

  const completedCount = todayTasks.filter((t: any) => t.status === 'COMPLETED').length
  const progressPercent = todayTasks.length > 0 ? Math.round((completedCount / todayTasks.length) * 100) : 0

  return (
    <OwnerLayout title="Daily Operations Agenda">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Daily Operations & Checklist</h1>
            <p className="text-sm text-muted-foreground">
              Review daily priorities, complete scheduled milestones, and keep fulfillment on track
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40 h-9 text-sm"
            />
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Quick Add
            </Button>
          </div>
        </div>

        {/* Daily Progress Banner */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  Today's Execution Progress ({completedCount} of {todayTasks.length} Done)
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing scheduled tasks for {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-36 bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm font-bold text-foreground">{progressPercent}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Checklist */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Agenda Items</span>
              <Badge variant="outline">{todayTasks.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading daily agenda...</div>
            ) : todayTasks.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="font-semibold text-foreground">No tasks scheduled for this date</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Enjoy your day or add items to plan ahead!
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Task for Today
                </Button>
              </div>
            ) : (
              todayTasks.map((task: any) => {
                const isCompleted = task.status === 'COMPLETED'
                return (
                  <div
                    key={task.id}
                    className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                      isCompleted ? 'bg-muted/20 opacity-70' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() =>
                          toggleStatus.mutate({
                            id: task.id,
                            status: isCompleted ? 'IN_PROGRESS' : 'COMPLETED',
                          })
                        }
                        className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <Link
                          to={`/tasks/${task.id}`}
                          className={`text-sm font-semibold hover:underline truncate block ${
                            isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {task.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>Brand: {task.brand?.name || 'General'}</span>
                          <span>• Priority: {task.priority}</span>
                          {task.assignees?.length > 0 && (
                            <span>• {task.assignees[0]?.user?.fullName}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          isCompleted ? 'success' : task.status === 'IN_PROGRESS' ? 'info' : 'outline'
                        }
                      >
                        {task.status}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                        <Link to={`/tasks/${task.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Quick Add Modal */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Quick Add Daily Task"
          description="Add a task scheduled for this date"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!currentBusinessId) return
              createDailyTask.mutate({
                businessId: currentBusinessId,
                title,
                taskType: 'DAILY_TASK',
                priority,
                dueDate: new Date(selectedDate).toISOString(),
              })
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Title *</label>
              <Input
                required
                placeholder="e.g. Verify morning inventory count"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Priority</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDailyTask.isPending}>
                Add to Agenda
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </OwnerLayout>
  )
}
