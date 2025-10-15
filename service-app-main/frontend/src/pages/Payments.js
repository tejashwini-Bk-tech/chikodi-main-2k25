import React, { useState } from 'react';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from '../hooks/use-toast';

const Payments = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', number: '', expiry: '', cvv: '' });

  const onPay = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Mock payment
    setTimeout(() => {
      setLoading(false);
      toast({ title: 'Payment successful', description: 'Your payment has been processed.' });
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
