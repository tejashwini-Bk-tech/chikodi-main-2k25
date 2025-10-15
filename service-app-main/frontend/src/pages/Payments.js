import React, { useState } from 'react';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Payments = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', number: '', expiry: '', cvv: '' });

  const luhnValid = (num) => {
    const digits = (num || '').replace(/\D/g, '');
    let sum = 0, alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits[i], 10);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return digits.length >= 12 && sum % 10 === 0;
  };

  const expiryValid = (exp) => {
    const m = /^\s*(0[1-9]|1[0-2])\/(\d{2})\s*$/.exec(exp || '');
    if (!m) return false;
    const mm = parseInt(m[1], 10);
    const yy = parseInt(m[2], 10);
    const now = new Date();
    const curYY = now.getFullYear() % 100;
    const curMM = now.getMonth() + 1;
    return yy > curYY || (yy === curYY && mm >= curMM);
  };

  const cvvValid = (cvv) => /^[0-9]{3,4}$/.test((cvv || '').trim());

  const onPay = async (e) => {
    e.preventDefault();
    const name = (form.name || '').trim();
    const number = (form.number || '').trim();
    const expiry = (form.expiry || '').trim();
    const cvv = (form.cvv || '').trim();
    if (!name) {
      toast.error('Cardholder name required', { description: 'Please enter the name on the card.' });
      return;
    }
    if (!luhnValid(number)) {
      toast.error('Invalid card number', { description: 'Check the number and try again.' });
      return;
    }
    if (!expiryValid(expiry)) {
      toast.error('Invalid expiry', { description: 'Use MM/YY and ensure the date is in the future.' });
      return;
    }
    if (!cvvValid(cvv)) {
      toast.error('Invalid CVV', { description: 'CVV must be 3 or 4 digits.' });
      return;
    }
    toast('Processing payment...');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Payment successful', { description: 'Your payment has been processed.' });
    }, 800);
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>Secure checkout powered by NEXORA</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onPay} className="space-y-4">
              <div>
                <Label>Cardholder Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Card Number</Label>
                <Input inputMode="numeric" maxLength={19} placeholder="1234 5678 9012 3456" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Expiry</Label>
                  <Input placeholder="MM/YY" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} required />
                </div>
                <div>
                  <Label>CVV</Label>
                  <Input inputMode="numeric" maxLength={4} value={form.cvv} onChange={(e) => setForm({ ...form, cvv: e.target.value })} required />
                </div>
              </div>
              <Button disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
                {loading ? 'Processing…' : 'Pay Now'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/90 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Review your services and total</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Selected Service</span>
                <span className="font-medium">Cleaning</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-medium">$80.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Taxes</span>
                <span className="font-medium">$8.00</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">$88.00</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payments;
