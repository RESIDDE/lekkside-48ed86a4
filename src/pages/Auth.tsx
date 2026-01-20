import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import lekksideLogo from '@/assets/lekkside-logo.png';

const emailSchema = z.string().email('Please enter a valid email address');

type AuthStep = 'email' | 'otp';
type AuthMode = 'signin' | 'signup';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<AuthStep>('email');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  
  const otpInputRef = useRef<HTMLInputElement>(null);
  const { user, sendAuthOtp, verifyAuthOtp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otpCode.length === 6) {
      handleVerifyOtp();
    }
  }, [otpCode]);

  const validateEmail = () => {
    try {
      emailSchema.parse(email);
      return true;
    } catch {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const validateSignup = () => {
    if (!validateEmail()) return false;
    
    if (mode === 'signup' && !fullName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your full name.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateSignup()) return;

    setIsLoading(true);
    const { error, debugCode } = await sendAuthOtp(email);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Failed to send code',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setStep('otp');
    setResendCountdown(60);

    // Debug mode: auto-fill OTP
    if (debugCode) {
      toast({
        title: 'Debug Mode',
        description: 'Code auto-filled for testing',
      });
      setOtpCode(debugCode);
    } else {
      toast({
        title: 'Code sent',
        description: `We've sent a verification code to ${email}`,
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;

    setIsLoading(true);
    const { error, isNewUser } = await verifyAuthOtp(email, otpCode, mode === 'signup' ? fullName : undefined);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
      setOtpCode('');
      return;
    }

    toast({
      title: isNewUser ? 'Account created!' : 'Welcome back!',
      description: isNewUser 
        ? 'Your account has been created successfully.' 
        : 'You have been signed in successfully.',
    });
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) return;
    
    setIsLoading(true);
    const { error, debugCode } = await sendAuthOtp(email);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Failed to resend code',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setResendCountdown(60);
    setOtpCode('');

    if (debugCode) {
      toast({
        title: 'Debug Mode',
        description: 'Code auto-filled for testing',
      });
      setOtpCode(debugCode);
    } else {
      toast({
        title: 'Code resent',
        description: `A new code has been sent to ${email}`,
      });
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtpCode('');
  };

  const handleTabChange = (value: string) => {
    setMode(value as AuthMode);
    setStep('email');
    setOtpCode('');
  };

  const renderEmailStep = () => (
    <form onSubmit={handleSendOtp} className="space-y-4">
      {mode === 'signup' && (
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            className="h-12 text-base"
            required={mode === 'signup'}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-12 text-base"
          required
        />
      </div>
      <Button 
        type="submit" 
        className="w-full h-12 text-base font-semibold" 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending code...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Verification Code
          </>
        )}
      </Button>
    </form>
  );

  const renderOtpStep = () => (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Use different email
      </button>

      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to<br />
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <InputOTP
          maxLength={6}
          value={otpCode}
          onChange={setOtpCode}
          disabled={isLoading}
          ref={otpInputRef}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        {isLoading && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Didn't receive the code?{' '}
          {resendCountdown > 0 ? (
            <span className="text-muted-foreground">
              Resend in {resendCountdown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResendCode}
              className="text-primary hover:underline font-medium"
              disabled={isLoading}
            >
              Resend code
            </button>
          )}
        </p>
      </div>
    </div>
  );

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
          <Tabs value={mode} onValueChange={handleTabChange}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="signin" className="text-base" disabled={step === 'otp'}>
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-base" disabled={step === 'otp'}>
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent className="pt-0">
              <TabsContent value="signin" className="mt-0">
                <CardDescription className="mb-5 text-center">
                  {step === 'email' 
                    ? 'Sign in to manage events and check-ins'
                    : 'Enter the code sent to your email'
                  }
                </CardDescription>
                {step === 'email' ? renderEmailStep() : renderOtpStep()}
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <CardDescription className="mb-5 text-center">
                  {step === 'email'
                    ? 'Create an account to start managing events'
                    : 'Enter the code sent to your email'
                  }
                </CardDescription>
                {step === 'email' ? renderEmailStep() : renderOtpStep()}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
