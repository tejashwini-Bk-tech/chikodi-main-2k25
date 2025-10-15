import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../hooks/use-toast';
import axios from 'axios';

const OTPVerification = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const initialContact = location.state?.contact || '';
  const [contact, setContact] = useState(initialContact);
  const [otpReady, setOtpReady] = useState(!!initialContact);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const isPhoneValid = /^\+?[0-9]{10,15}$/.test(contact);

  useEffect(() => {
    if (!otpReady) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown, otpReady]);

  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^[0-9]*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleSendOTP = () => {
    if (!isPhoneValid) {
      setPhoneTouched(true);
      return;
    }
    (async () => {
      try {
        await axios.post('https://heytejuu.app.n8n.cloud/webhook/otp-send', {
          mobile_number: contact
        }, { headers: { 'Content-Type': 'application/json' } });
        setOtp(['', '', '', '', '', '']);
        setCountdown(60);
        setCanResend(false);
        setOtpReady(true);
        toast({ title: 'OTP Sent', description: `Code sent to ${contact}` });
      } catch (err) {
        toast({ title: 'Failed to send OTP', description: 'Please try again', variant: 'destructive' });
      }
    })();
  };

  const handleVerify = (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length === 6) {
      (async () => {
        try {
          const response = await axios.post('https://heytejuu.app.n8n.cloud/webhook/validate', {
            mobile_number: contact,
            otp: otpValue
          }, { headers: { 'Content-Type': 'application/json' } });
          if (response?.data?.verified) {
            toast({ title: 'Verification Successful!', description: 'Your phone number has been verified' });
            localStorage.setItem('isVerified', 'true');
            // Store verified phone to update profile after login
            localStorage.setItem('verifiedPhone', contact);
            setTimeout(() => navigate('/login'), 500);
          } else {
            toast({ title: 'Invalid OTP', description: 'Please enter the correct OTP', variant: 'destructive' });
          }
        } catch (err) {
          toast({ title: 'Verification failed', description: 'Please try again', variant: 'destructive' });
        }
      })();
    }
  };

  const handleResend = () => {
    if (!contact) return;
    (async () => {
      try {
        await axios.post('https://heytejuu.app.n8n.cloud/webhook/otp-send', {
          mobile_number: contact
        }, { headers: { 'Content-Type': 'application/json' } });
        setCountdown(60);
        setCanResend(false);
        toast({ title: 'OTP Resent', description: `New code sent to ${contact}` });
      } catch (err) {
        toast({ title: 'Failed to resend OTP', description: 'Please try again', variant: 'destructive' });
      }
    })();
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Verify OTP
            </CardTitle>
            <CardDescription className="text-base">
              {!otpReady ? (
                <span>Enter your phone number to receive a 6-digit code</span>
              ) : (
                <>
                  Enter the 6-digit code sent to<br />
                  <span className="font-semibold">{contact}</span>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-6">
              {/* Phone Number */}
              {!otpReady && (
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. +15551234567 or 9876543210"
                    value={contact}
                    onChange={(e) => setContact(e.target.value.trim())}
                    onBlur={() => setPhoneTouched(true)}
                    className="mt-2"
                  />
                  {phoneTouched && !isPhoneValid && (
                    <p className="mt-1 text-xs text-red-600">Enter a valid phone number (10-15 digits, optional +).</p>
                  )}
                  <div className="mt-3">
                    <Button type="button" onClick={handleSendOTP} disabled={!isPhoneValid} className="w-full">Send OTP</Button>
                  </div>
                </div>
              )}

              {/* OTP Input Fields */}
              {otpReady && (
              <div>
                <Label className="text-sm font-medium mb-3 block">Enter OTP</Label>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-bold transition-all duration-200 focus:scale-110"
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                  Demo OTP: 123456
                </p>
              </div>
              )}

              {/* Countdown Timer */}
              {otpReady && (
                <div className="text-center">
                  {!canResend ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400 animate-pulse">
                      Resend OTP in {countdown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-sm text-blue-600 hover:text-cyan-500 transition-colors duration-200 font-medium animate-in fade-in"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              )}

              {/* Verify Button */}
              {otpReady && (
                <Button
                  type="submit"
                  disabled={otp.join('').length !== 6}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-6 text-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  Verify & Continue
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OTPVerification;