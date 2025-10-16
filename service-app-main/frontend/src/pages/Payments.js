import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, CheckCircle2, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const Payments = () => {
  const [userId, setUserId] = useState(null);
  const [bookings, setBookings] = useState([]); // completed bookings for this user
  const [payments, setPayments] = useState([]); // existing payments by this user
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s?.session?.user?.id || null;
      setUserId(uid);
    };

  const payCash = async (booking, amountInRupees) => {
    try {
      const amt = Number(amountInRupees);
      if (!Number.isFinite(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
      const payload = {
        booking_id: booking.id,
        provider_id: booking.provider_id,
        user_id: userId,
        amount: amt,
        currency: 'INR',
        paid_at: new Date().toISOString(),
        method: 'cash',
      };
      const { error } = await supabase.from('payments').insert(payload);
      if (error) throw new Error(error.message);
      toast.success('Cash payment recorded');
    } catch (e) {
      toast.error(e?.message || 'Failed to record cash payment');
    }
  };
    init();
  }, []);

  // Load completed bookings and payments; subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;
    let ch1, ch2;
    let cancelled = false;
    const load = async () => {
      try {
        const [{ data: b }, { data: p }] = await Promise.all([
          supabase.from('bookings').select('id, provider_id, address, notes, scheduled_date, scheduled_time, requested_at').eq('user_id', userId).eq('status', 'completed').order('requested_at', { ascending: false }),
          supabase.from('payments').select('booking_id, amount').eq('user_id', userId)
        ]);
        if (!cancelled) {
          setBookings(b || []);
          setPayments(p || []);
        }
      } catch (_) {}
    };
    load();
    try {
      ch1 = supabase
        .channel(`rt-user-bookings-completed-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${userId}` }, load)
        .subscribe();
      ch2 = supabase
        .channel(`rt-user-payments-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `user_id=eq.${userId}` }, load)
        .subscribe();
    } catch (_) {}
    return () => { cancelled = true; try { ch1 && supabase.removeChannel(ch1); ch2 && supabase.removeChannel(ch2); } catch (_) {} };
  }, [userId]);

  const paidByBooking = useMemo(() => {
    const map = new Map();
    for (const p of payments) {
      if (p.booking_id) map.set(p.booking_id, true);
    }
    return map;
  }, [payments]);

  const awaiting = useMemo(() => bookings.filter(b => !paidByBooking.get(b.id)), [bookings, paidByBooking]);

  const startPayment = async (booking, amountInRupees) => {
    try {
      if (!window.Razorpay) { toast.error('Payments not ready'); return; }
      const amountPaise = Math.round(Number(amountInRupees) * 100);
      if (!Number.isFinite(amountPaise) || amountPaise <= 0) { toast.error('Enter a valid amount'); return; }
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: { amount: amountPaise, currency: 'INR', provider_id: booking.provider_id, booking_id: booking.id },
      });
      if (error) throw new Error(error.message || 'Failed to create order');
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: 'NEXORA',
        description: 'Service Payment',
        notes: { provider_id: booking.provider_id, user_id: userId, booking_id: booking.id },
        handler: function () {
          toast.success('Payment processing. Wallet will update shortly.');
        },
        theme: { color: '#0ea5e9' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      toast.error(e?.message || 'Payment failed to start');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Completed Work</CardTitle>
                <CardDescription>Bookings marked completed by your providers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {awaiting.length === 0 ? (
              <div className="text-sm text-slate-600">No pending payments. You're all set!</div>
            ) : (
              <div className="divide-y">
                {awaiting.map((b) => (
                  <BookingPayRow key={b.id} booking={b} onPay={startPayment} onCash={payCash} loading={loading} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/90 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Your latest successful payments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-sm text-slate-600">No payments yet.</div>
            ) : (
              <div className="space-y-2 text-sm">
                {payments.slice(0, 8).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-slate-600">Booking: {p.booking_id || 'N/A'}</span>
                    <span className="font-semibold">₹{Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const BookingPayRow = ({ booking, onPay, onCash, loading }) => {
  const [amount, setAmount] = useState('');
  return (
    <div className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800">Booking ID: {booking.id}</div>
        {booking.scheduled_date || booking.scheduled_time ? (
          <div className="text-xs text-slate-600">When: {booking.scheduled_date || ''} {booking.scheduled_time || ''}</div>
        ) : null}
        {booking.address && <div className="text-xs text-slate-600">Address: {booking.address}</div>}
        {booking.notes && <div className="text-xs text-slate-500">Notes: {booking.notes}</div>}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <input
          type="number"
          min="1"
          step="0.5"
          placeholder="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-36 rounded-md border px-2 py-2 text-sm"
        />
        <Button disabled={loading} onClick={() => onPay(booking, amount)} className="px-4">
          <CreditCard className="w-4 h-4 mr-1" /> Pay
        </Button>
        <Button disabled={loading} variant="outline" onClick={() => onCash(booking, amount)} className="px-4">
          Cash
        </Button>
      </div>
    </div>
  );
};

export default Payments;
