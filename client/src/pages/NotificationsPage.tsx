import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import OwnerLayout from '@/components/layout/OwnerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, CheckCheck, Clock, ExternalLink } from 'lucide-react'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  actionUrl?: string
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
  })

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })

  const markAllAsRead = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })

  const notifications: NotificationItem[] = data?.notifications || []
  const unreadCount: number = data?.unreadCount || 0

  return (
    <OwnerLayout title="Notifications">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Stay informed on task updates, approvals, distributions, and alerts
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read ({unreadCount})
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="font-semibold text-foreground">All caught up!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have any notifications at the moment.
                </p>
              </div>
            ) : (
              notifications.map((notif: any) => {
              const isRead = Boolean(notif.readAt || notif.isRead)
              const typeLabel = (notif.relatedEntity || notif.type || 'SYSTEM').toString()

              return (
                <div
                  key={notif.id}
                  className={`p-4 flex items-start gap-4 transition-colors ${
                    !isRead ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                >
                  <div
                    className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                      !isRead ? 'bg-primary' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground">{notif.title}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {typeLabel.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{notif.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                      {notif.actionUrl && (
                        <a
                          href={notif.actionUrl}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          View Details <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  {!isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead.mutate(notif.id)}
                      className="h-8 w-8 p-0"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  )
}
