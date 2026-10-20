import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import OwnerLayout from '@/components/layout/OwnerLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/useToast'
import { User, Mail, Shield, KeyRound, Loader2, Save } from 'lucide-react'
import api from '@/lib/api'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()

  const [fullName, setFullName] = useState(user?.fullName || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [bio, setBio] = useState(user?.biography || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    try {
      const res = await api.put('/users/profile', {
        fullName,
        phone,
        biography: bio,
      })
      updateUser(res.data.data)
      toast({
        title: 'Profile Updated',
        description: 'Your personal information has been saved successfully.',
      })
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.response?.data?.message || 'Failed to update profile.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Mismatch',
        description: 'New password and confirmation do not match.',
        variant: 'destructive',
      })
      return
    }
    if (newPassword.length < 8) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      })
      return
    }
    setIsChangingPassword(true)
    try {
      await api.put('/users/password', {
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast({
        title: 'Password Changed',
        description: 'Your security credentials have been updated.',
      })
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update password.',
        variant: 'destructive',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <OwnerLayout title="My Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal profile, credentials, and business permissions
          </p>
        </div>

        {/* Profile Info Header Card */}
        <Card>
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {user?.fullName?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div className="space-y-1 text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{user?.fullName}</h2>
                <Badge variant="outline" className="w-fit mx-auto sm:mx-0">
                  <Shield className="h-3 w-3 mr-1 text-primary" />
                  {user?.accountType?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                <Mail className="h-3.5 w-3.5" /> {user?.email} • @{user?.username}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Details Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Details
              </CardTitle>
              <CardDescription>Update your contact and display information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Phone Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 555-0192"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Biography / Notes</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A brief intro about your role..."
                  />
                </div>

                <Button type="submit" disabled={isSavingProfile} className="w-full gap-2">
                  {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Security & Password
              </CardTitle>
              <CardDescription>Ensure your account remains safe with a strong password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Current Password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Confirm New Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>

                <Button type="submit" variant="outline" disabled={isChangingPassword} className="w-full gap-2">
                  {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  )
}
