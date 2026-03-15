import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ArrowLeft, Mail, KeyRound, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import lekksideLogo from '@/assets/lekkside-logo.png';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type ForgotPasswordStep = 'email' | 'otp' | 'newPassword';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<ForgotPasswordStep>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validateInputs = (includeFullName = false) => {
    try {
      emailSchema.parse(email);
    } catch {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      passwordSchema.parse(password);
    } catch {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return false;
    }

    if (includeFullName && !fullName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your full name.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message.includes('already registered')
          ? 'This email is already registered. Please sign in instead.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account created',
        description: 'Welcome to Lekkside Check-in Portal!',
      });
    }
  };

  // Forgot Password Handlers
  const handleSendResetOtp = async () => {
    try {
      emailSchema.parse(resetEmail);
    } catch {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-otp', {
        body: { email: resetEmail },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Code sent',
        description: 'If an account exists with this email, a reset code has been sent.',
      });
      setForgotPasswordStep('otp');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (resetOtp.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter the 6-digit code.',
        variant: 'destructive',
      });
      return;
    }

    setForgotPasswordStep('newPassword');
  };

  const handleResetPassword = async () => {
    try {
      passwordSchema.parse(newPassword);
    } catch {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { 
          email: resetEmail, 
          code: resetOtp, 
          newPassword 
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Password reset successful',
        description: 'You can now sign in with your new password.',
      });

      // Reset state and go back to sign in
      resetForgotPasswordState();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const resetForgotPasswordState = () => {
    setShowForgotPassword(false);
    setForgotPasswordStep('email');
    setResetEmail('');
    setResetOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // Forgot Password UI
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src={lekksideLogo} 
              alt="Lekkside Logo" 
              className="w-20 h-20 rounded-full mx-auto mb-4 shadow-lg object-cover"
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reset Password</h1>
            <p className="text-muted-foreground mt-2">
              {forgotPasswordStep === 'email' && 'Enter your email to receive a reset code'}
              {forgotPasswordStep === 'otp' && 'Enter the 6-digit code sent to your email'}
              {forgotPasswordStep === 'newPassword' && 'Create a new password'}
            </p>
          </div>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={resetForgotPasswordState}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {forgotPasswordStep === 'email' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-12 pl-10 text-base"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleSendResetOtp} 
                    className="w-full h-12 text-base font-semibold"
                    disabled={isSendingOtp}
                  >
                    {isSendingOtp ? 'Sending...' : 'Send Reset Code'}
                  </Button>
                </div>
              )}

              {forgotPasswordStep === 'otp' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Verification Code</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Enter the 6-digit code sent to {resetEmail}
                    </p>
                    <div className="flex justify-center">
                      <InputOTP 
                        maxLength={6} 
                        value={resetOtp} 
                        onChange={setResetOtp}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                          <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                          <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                          <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                          <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                          <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  <Button 
                    onClick={handleVerifyOtp} 
                    className="w-full h-12 text-base font-semibold"
                    disabled={resetOtp.length !== 6}
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Verify Code
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setForgotPasswordStep('email')}
                    className="w-full"
                  >
                    Didn't receive the code? Try again
                  </Button>
                </div>
              )}

              {forgotPasswordStep === 'newPassword' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-12 pl-10 text-base"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-new-password"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-12 pl-10 text-base"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleResetPassword} 
                    className="w-full h-12 text-base font-semibold"
                    disabled={isResettingPassword || !newPassword || !confirmNewPassword}
                  >
                    {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={lekksideLogo} 
            alt="Lekkside Logo" 
            className="w-20 h-20 rounded-full mx-auto mb-4 shadow-lg object-cover"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Lekkside Check-in Portal</h1>
          <p className="text-muted-foreground mt-2">Leading to Fulfilled Futures</p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-4 text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Server Maintenance</h2>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <CardDescription className="text-base">
              Our servers are currently down for scheduled maintenance. We're working to get things back up as soon as possible.
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              Please check back later. We apologize for the inconvenience.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
