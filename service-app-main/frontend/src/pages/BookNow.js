import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, MapPin, MessageSquare, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';

const BookNow = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [status, setStatus] = useState('idle');
  const [date, setDate] = useState();
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('idle'); // idle | booked | requested
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setStatus('loading');
        const { data, error } = await supabase
          .from('providers')
          .select('*')
          .eq('provider_id', id)
          .maybeSingle();
        if (error) throw error;
        if (!data) { navigate('/providers'); return; }
        // Signed face photo URL if present
        let imageUrl = '';
        const facePath = data?.documents?.face_photo;
        if (facePath && typeof facePath === 'string') {
          try {
            const { data: signed, error: sErr } = await supabase.storage.from('provider-docs').createSignedUrl(facePath, 3600);
            if (!sErr && signed?.signedUrl) imageUrl = signed.signedUrl;
          } catch (_) {}
        }
        setProvider({ ...data, imageUrl });
        setStatus('success');
      } catch (e) {
        setStatus('error');
        navigate('/providers');
      }
    };
    load();
  }, [id, navigate]);

  const getGeolocation = () => new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords || {};
        resolve({ lat: latitude, lng: longitude, accuracy });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      toast.error('Address required', { description: 'Please enter your service address.' });
      return;
    }
    const live = await getGeolocation();
    if (live) setUserLocation(live);
    const isAvailable = provider?.is_available ?? provider?.availability_status ?? false;
    if (!isAvailable) {
      if (!date) {
        toast.error('Date required', { description: 'Please select a booking date.' });
        return;
      }
      if (!time) {
        toast.error('Time required', { description: 'Please select a time slot.' });
        return;
      }
      try {
        const scheduled_date = date ? new Date(date).toISOString().slice(0,10) : null;
        const scheduled_time = time || null;
        let user_id = null;
        try { const { data: s } = await supabase.auth.getSession(); user_id = s?.session?.user?.id || null; } catch {}
        const payload = {
          provider_id: id,
          user_id,
          status: 'requested',
          address,
          notes,
          user_location: live || null,
          scheduled_date,
          scheduled_time,
        };
        await supabase.from('bookings').insert(payload);
      } catch (_) {}
      toast.success('Request Sent!', { description: 'The provider will review your requested date/time.' });
      setBookingStatus('requested');
      return;
    }
    try {
      let user_id = null;
      try { const { data: s } = await supabase.auth.getSession(); user_id = s?.session?.user?.id || null; } catch {}
      const payload = {
        provider_id: id,
        user_id,
        status: 'booked',
        address,
        notes,
        user_location: live || null,
        scheduled_date: date ? new Date(date).toISOString().slice(0,10) : null,
        scheduled_time: time || null,
      };
      await supabase.from('bookings').insert(payload);
    } catch (_) {}
    toast.success('Booked!', { description: 'Your booking is confirmed.' });
    setBookingStatus('booked');
  };

  

  if (status === 'loading') return (
    <div className="min-h-screen pt-20 pb-12 px-4"><div className="max-w-4xl mx-auto text-slate-600">Loading…</div></div>
  );
  if (!provider) return null;

  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
    '4:00 PM', '5:00 PM', '6:00 PM'
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 animate-in fade-in duration-500">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
            Book Service
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Schedule your appointment with {(provider.professions?.[0] || 'Provider').replace('_',' ')} (ID: {provider.provider_id})</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booking Form */}
          <Card className="lg:col-span-2 border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                {provider?.is_available ?? provider?.availability_status ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <CardTitle>Booking Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {userLocation && (
                  <div className="rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3">
                    Captured your live location: {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                  </div>
                )}
                {!(provider?.is_available ?? provider?.availability_status ?? false) && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
                    Provider is currently busy. Please choose a date and time and we'll notify them to accept.
                  </div>
                )}
                {/* Date Selection */}
                <div>
                  <Label>Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-2"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? date.toLocaleDateString() : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(date) => date < new Date(new Date().toDateString())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Selection */}
                <div>
                  <Label>Select Time</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={time === slot ? 'default' : 'outline'}
                        onClick={() => setTime(slot)}
                        className={`transition-all duration-200 ${
                          time === slot
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white'
                            : ''
                        }`}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label htmlFor="address">Service Address</Label>
                  <div className="relative mt-2">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="address"
                      type="text"
                      placeholder="Enter your address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific requirements or instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 min-h-24"
                  />
                </div>

                {/* Submit Button */}
                {bookingStatus === 'idle' && (
                  <Button
                    type="submit"
                    disabled={!(provider?.is_available ?? provider?.availability_status ?? false) ? (!date || !time || !address) : !address}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-6 text-lg transition-all duration-300 hover:scale-[1.02]"
                  >
                    {(provider?.is_available ?? provider?.availability_status ?? false) ? 'Book Now' : 'Request Booking'}
                  </Button>
                )}

                {/* Message box after booking/request */}
                {bookingStatus !== 'idle' && (
                  <div className="space-y-3 animate-in fade-in duration-500">
                    <Label htmlFor="messageBox">Message Provider</Label>
                    <Textarea
                      id="messageBox"
                      placeholder={bookingStatus === 'booked' ? 'Send a message with any details for the visit…' : 'Send a message about your requested timing…'}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="min-h-24"
                    />
                    <div className="flex justify-end">
                      <Button type="button" onClick={() => { toast.success('Message sent'); setMessageText(''); }}>
                        Send Message
                      </Button>
                    </div>
                    
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Provider Summary */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-500">
              <CardHeader>
                <CardTitle>Service Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-16 h-16 ring-2 ring-blue-600">
                    <AvatarImage src={provider.imageUrl} alt={provider.provider_id} />
                    <AvatarFallback>{(provider.professions?.[0] || 'P')[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{(provider.professions?.[0] || 'Provider').replace('_',' ')}</h3>
                      {(provider?.is_available ?? provider?.availability_status) ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Available</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Busy</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">ID: {provider.provider_id}</p>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Location</span>
                    <span className="font-semibold">{typeof provider?.location?.lat === 'number' && typeof provider?.location?.lng === 'number' ? `${provider.location.lat.toFixed(5)}, ${provider.location.lng.toFixed(5)}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Last Update</span>
                    <span className="font-semibold">{provider.last_location_at ? new Date(provider.last_location_at).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/provider/${provider.provider_id}`)}
                >
                  View Full Profile
                </Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-700">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Need Help?</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Contact our support team if you have any questions about the booking.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookNow;