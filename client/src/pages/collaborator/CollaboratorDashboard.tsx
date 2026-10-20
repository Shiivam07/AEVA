import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/hooks/useToast'
import {
  CheckSquare,
  Clock,
  MessageSquare,
  Send,
  Calendar,
  LogOut,
  Sun,
  Moon,
  Bell,
  Search,
  Filter,
  ArrowUpRight,
  User,
  AlertCircle,
  FileCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'

export default function CollaboratorDashboard() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')

  // Fetch my tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data.data),
  })

  // Fetch selected task details
  const { data: taskDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['task-detail', selectedTaskId],
    queryFn: () => api.get(`/tasks/${selectedTaskId}`).then((r) => r.data.data),
    enabled: !!selectedTaskId,
  })

  // Update task status
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-detail', selectedTaskId] })
      toast({ title: 'Status Updated', description: 'Task status changed successfully.' })
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update status.',
        variant: 'destructive',
      })
    },
  })

  // Add comment
  const addComment = useMutation({
    mutationFn: ({ id, commentText }: { id: string; commentText: string }) =>
      api.post(`/tasks/${id}/comments`, { commentText }),
    onSuccess: () => {
      setNewComment('')
      queryClient.invalidateQueries({ queryKey: ['task-detail', selectedTaskId] })
      toast({ title: 'Comment Added' })
    },
  })

  const tasks = tasksData?.tasks || []
  const filteredTasks = tasks.filter((t: any) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.brand?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const pendingCount = tasks.filter((t: any) => ['NOT_STARTED', 'IN_PROGRESS'].includes(t.status)).length
  const completedCount = tasks.filter((t: any) => t.status === 'COMPLETED').length

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight">AEVA Collaborator Workspace</h1>
            <p className="text-xs text-muted-foreground">{user?.fullName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/profile" className="gap-2">
              <User className="h-4 w-4" /> Profile
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Active Assignments</span>
                <Clock className="h-4 w-4 text-primary" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold">{pendingCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Tasks currently in progress or awaiting action</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Completed Tasks</span>
                <FileCheck className="h-4 w-4 text-emerald-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold">{completedCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Successfully finalized assignments</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between">
                <span>Total Assigned</span>
                <CheckSquare className="h-4 w-4 text-indigo-500" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold">{tasks.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Across all brands and businesses</CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {tasksLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading your assigned tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl border-dashed">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-semibold text-foreground">No tasks found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You are all caught up on your assignments!
              </p>
            </div>
          ) : (
            filteredTasks.map((task: any) => (
              <Card
                key={task.id}
                className="hover:border-primary/50 transition-all cursor-pointer shadow-sm"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-base">{task.title}</span>
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
                      <Badge variant="outline" className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Brand: <strong className="text-foreground">{task.brand?.name || 'General'}</strong></span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <span>Type: {task.taskType?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTaskId(task.id)
                      }}
                      className="gap-1.5"
                    >
                      View & Update <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Task Detail Modal */}
        <Modal
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          title={taskDetail?.title || 'Task Details'}
          description={`Brand: ${taskDetail?.brand?.name || 'General'} • Task Type: ${taskDetail?.taskType?.replace(/_/g, ' ')}`}
          maxWidth="2xl"
        >
          {detailLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading details...</div>
          ) : taskDetail ? (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Description / Instructions
                </h4>
                <p className="text-sm text-foreground bg-muted/40 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {taskDetail.description || 'No description provided.'}
                </p>
              </div>

              {/* Status Update Quick Buttons */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Update Progress
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['NOT_STARTED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].map((st) => (
                    <Button
                      key={st}
                      variant={taskDetail.status === st ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: taskDetail.id, status: st })}
                      disabled={updateStatus.isPending}
                    >
                      {st.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Comments Section */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" /> Discussion & Updates ({taskDetail.comments?.length || 0})
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {taskDetail.comments?.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No comments yet. Start the conversation!</p>
                  ) : (
                    taskDetail.comments?.map((c: any) => (
                      <div key={c.id} className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground font-semibold">
                          <span>{c.user?.fullName || 'User'}</span>
                          <span>{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-foreground text-sm">{c.commentText}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type a comment or status update..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newComment.trim()) {
                        addComment.mutate({ id: taskDetail.id, commentText: newComment })
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (newComment.trim()) {
                        addComment.mutate({ id: taskDetail.id, commentText: newComment })
                      }
                    }}
                    disabled={addComment.isPending || !newComment.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Modal>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t bg-card text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
        <div><strong>AEVA</strong> Team Workspace</div>
        <div>Made with <span className="text-red-500">❤️</span> by <strong className="text-foreground font-semibold">Shivam Chaurasia</strong></div>
      </footer>
    </div>
  )
}
