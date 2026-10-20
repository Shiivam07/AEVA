import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Building2, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/useToast'
import { Sun, Moon } from 'lucide-react'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username required'),
  password: z.string().min(1, 'Password required'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.identifier, data.password)
      // Redirect handled by RootRedirect in App
      navigate('/', { replace: true })
    } catch (err: any) {
      toast({
        title: 'Login failed',
        description: err.response?.data?.message || 'Invalid credentials',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-sidebar-foreground tracking-wider">AEVA</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-sidebar-foreground mb-4 leading-tight">
            Manage your brands,<br />teams & finances —<br />all in one place.
          </h1>
          <p className="text-sidebar-foreground/60 text-lg">
            A premium business operations platform for multi-brand enterprises.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Brands Managed', value: '∞' },
              { label: 'Task Workflows', value: '9+' },
              { label: 'Currency', value: 'INR (₹)' },
              { label: 'Team Members', value: '∞' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-sidebar-accent rounded-lg p-4">
                <div className="text-2xl font-bold text-sidebar-primary">{value}</div>
                <div className="text-sm text-sidebar-foreground/60 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sidebar-foreground/70 text-xs">
            Made with <span className="text-red-500">❤️</span> by <strong className="text-sidebar-foreground font-semibold">Shivam Chaurasia</strong>
          </p>
          <p className="text-sidebar-foreground/40 text-xs">© {new Date().getFullYear()} AEVA. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-wider">AEVA</span>
            </div>

            <h2 className="text-3xl font-bold mb-2">Welcome to AEVA</h2>
            <p className="text-muted-foreground mb-8">Sign in to your business operations workspace</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="identifier">
                  Email or Username
                </label>
                <Input
                  id="identifier"
                  placeholder="you@example.com or username"
                  autoComplete="username"
                  {...register('identifier')}
                />
                {errors.identifier && (
                  <p className="text-xs text-destructive">{errors.identifier.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Create account
              </Link>
            </p>

            <div className="text-center mt-6 text-xs text-muted-foreground">
              Made with <span className="text-red-500">❤️</span> by <span className="font-semibold text-foreground">Shivam Chaurasia</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
