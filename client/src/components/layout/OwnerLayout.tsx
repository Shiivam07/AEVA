import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Tags, CheckSquare, Calendar, ShoppingCart,
  Package, Users, IndianRupee, PieChart, Bell, User, Settings, LogOut,
  Sun, Moon, Menu, X, ChevronDown, TrendingUp, FileText
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn, getInitials } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  badge?: number
}

const ownerNavItems: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Brands', icon: Tags, href: '/brands' },
  { label: 'Tasks', icon: CheckSquare, href: '/tasks' },
  { label: 'Daily Tasks', icon: Calendar, href: '/daily-tasks' },
  { label: 'Orders', icon: ShoppingCart, href: '/orders' },
  { label: 'Products', icon: Package, href: '/products' },
  { label: 'People', icon: Users, href: '/people' },
  { label: 'Financials', icon: IndianRupee, href: '/financials' },
  { label: 'Distributions', icon: PieChart, href: '/distributions' },
  { label: 'Reports', icon: TrendingUp, href: '/reports' },
]

const sharedNavItems: NavItem[] = [
  { label: 'Notifications', icon: Bell, href: '/notifications' },
  { label: 'Profile', icon: User, href: '/profile' },
]

interface OwnerLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function OwnerLayout({ children, title }: OwnerLayoutProps) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Fetch unread notification count
  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/notifications?limit=1').then(r => r.data.data.unreadCount),
    refetchInterval: 30000,
  })

  const navWithBadge = ownerNavItems.map(item =>
    item.href === '/notifications' ? { ...item, badge: notifData || 0 } : item
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md">
          <Building2 className="h-5 w-5 text-primary-foreground" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col">
            <span className="font-extrabold text-sidebar-foreground text-lg tracking-wider">AEVA</span>
            <span className="text-[10px] text-sidebar-foreground/50 font-medium">Business Operations</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto px-2">
        {ownerNavItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-sidebar-border space-y-0.5">
        {sharedNavItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          )
        })}

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0 text-sidebar-primary text-xs font-bold">
            {getInitials(user?.fullName || 'U')}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-sidebar-foreground truncate">{user?.fullName}</div>
              <div className="text-xs text-sidebar-foreground/50 truncate">{user?.accountType === 'BUSINESS_OWNER' ? 'Business Owner' : user?.accountType}</div>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={logout}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Small attribution */}
        {sidebarOpen && (
          <div className="pt-2 pb-1 px-3 text-[11px] text-sidebar-foreground/50 text-center border-t border-sidebar-border/50">
            Made with <span className="text-red-500">❤️</span> by <span className="font-semibold text-sidebar-foreground/80">Shivam Chaurasia</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col flex-shrink-0 bg-sidebar transition-all duration-300',
        sidebarOpen ? 'w-60' : 'w-16'
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-sidebar flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur flex items-center px-4 gap-4">
          {/* Mobile menu */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            className="hidden lg:flex p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {title && <h1 className="text-lg font-semibold hidden sm:block">{title}</h1>}

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="h-5 w-5" />
              {notifData > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {notifData > 9 ? '9+' : notifData}
                </span>
              )}
            </Link>

            <Link to="/profile" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                {getInitials(user?.fullName || 'U')}
              </div>
              <span className="hidden sm:block text-sm font-medium">{user?.fullName?.split(' ')[0]}</span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 animate-fade-in">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-6 py-3 border-t bg-card/40 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>AEVA</strong> Multi-Brand Business Platform
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            Made with <span className="text-red-500">❤️</span> by <strong className="text-foreground font-semibold">Shivam Chaurasia</strong>
          </div>
        </footer>
      </div>
    </div>
  )
}
