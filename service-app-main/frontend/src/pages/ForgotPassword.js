import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { toast } from '../hooks/use-toast';

const ForgotPassword = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, step]);

  const handleSendOTP = (e) => {
    e.preventDefault();
    setStep(2);
    toast({
      title: t('otpSent'),
      description: emailOrPhone,
    });
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (otp === '123456') {
      toast({
        title: "Success",
        description: "OTP verified successfully",
      });
      setTimeout(() => navigate('/login'), 500);
    } else {
      toast({
        title: "Error",
        description: "Invalid OTP",
        variant: "destructive"
      });
    }
  };

  const handleResendOTP = () => {
    setCountdown(60);
    setCanResend(false);
    toast({
      title: "OTP Resent",
      description: emailOrPhone,
    });
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {t('forgotPasswordTitle')}
            </CardTitle>
            <CardDescription className="text-base">
              {t('forgotPasswordSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress Bar */}
            <div className="mb-6">
              <Progress value={step === 1 ? 50 : 100} className="h-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 text-center">
                Step {step} / 2
              </p>
            </div>

            {/* Step 1: Enter Email/Phone */}
            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <Label htmlFor="emailOrPhone">{t('emailOrPhone')}</Label>
                  <Input
                    id="emailOrPhone"
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="mt-2 transition-all duration-200 focus:scale-[1.02]"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-6 text-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  {t('sendOTP')}
                </Button>
              </form>
            )}

            {/* Step 2: Enter OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-4 animate-in slide-in-from-bottom duration-300">
                <div>
                  <Label htmlFor="otp">{t('enterOTP')}</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="mt-2 transition-all duration-200 focus:scale-[1.02]"
                    required
                  />
                </div>
                
                {/* Countdown Timer */}
                <div className="text-center">
                  {!canResend ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400 animate-pulse">
                      Resend OTP in {countdown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-sm text-blue-600 hover:text-cyan-500 transition-colors duration-200 animate-in fade-in"
                    >
                      {t('resendOTP')}
                    </button>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-6 text-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  {t('verifyOTP')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;