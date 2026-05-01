import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  Star, 
  Phone, 
  Mail, 
  Users, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  Shield,
  DollarSign,
  Timer
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, PROVIDER_DOCS_BUCKET } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
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
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ];

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
        if (!data) { 
          toast.error('Provider not found');
          navigate('/providers'); 
          return;
        }
        
        // Handle provider image
        let imageUrl = '';
        const facePath = data?.documents?.face_photo;
        if (facePath && typeof facePath === 'string') {
          const looksBase64 = facePath.length > 100 && !facePath.includes('/') && !facePath.includes('.');
          if (looksBase64) {
            imageUrl = `data:image/jpeg;base64,${facePath}`;
          } else {
            try {
              const { data: signed, error: sErr } = await supabase.storage.from(PROVIDER_DOCS_BUCKET).createSignedUrl(facePath, 3600);
              if (!sErr && signed?.signedUrl) imageUrl = signed.signedUrl;
            } catch (_) { }
          }
        }
        
        // Get provider profile
        let profileData = {};
        if (data.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, email, avatar_url')
            .eq('id', data.user_id)
            .maybeSingle();
          profileData = profile || {};
        }
        
        setProvider({ ...data, imageUrl, ...profileData });
        setStatus('success');
      } catch (e) {
        setStatus('error');
        toast.error('Failed to load provider');
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
        resolve({ latitude, longitude, lat: latitude, lng: longitude, accuracy });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  const handleUseLiveLocation = async () => {
    const live = await getGeolocation();
    if (!live) {
      toast.error('Location unavailable', { description: 'Please allow location access and try again.' });
      return;
    }
    setUserLocation(live);
    const locationText = `Live Location: ${live.lat.toFixed(6)}, ${live.lng.toFixed(6)}${live.accuracy ? ` (±${Math.round(live.accuracy)}m)` : ''}`;
    setAddress(locationText);
    toast.success('Live location captured');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
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
        
        // Book for unavailable provider
        const scheduled_date = date ? new Date(date).toISOString().slice(0, 10) : null;
        const scheduled_time = time || null;
        let user_id = null;
        try { 
          const { data: s } = await supabase.auth.getSession(); 
          user_id = s?.session?.user?.id || null; 
        } catch { }
        
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
        
        const { data, error } = await supabase.from('bookings').insert(payload).select('id');
        if (error) {
          toast.error('Failed to send request', { description: error.message || 'Please try again.' });
          return;
        }
        
        toast.success('Request Sent!', { description: 'The provider will review your requested date/time.' });
        setBookingStatus('requested');
        return;
      }
      
      // Book for available provider
      let user_id = null;
      try { 
        const { data: s } = await supabase.auth.getSession(); 
        user_id = s?.session?.user?.id || null; 
      } catch { }
      
      const payload = {
        provider_id: id,
        user_id,
        status: 'booked',
        address,
        notes,
        user_location: live || null,
        scheduled_date: date ? new Date(date).toISOString().slice(0, 10) : null,
        scheduled_time: time || null,
      };
      
      const { data, error } = await supabase.from('bookings').insert(payload).select('id');
      if (error) {
        toast.error('Failed to book', { description: error.message || 'Please try again.' });
        return;
      }
      
      toast.success('Booking Confirmed!', { description: 'Your service has been booked successfully.' });
      setBookingStatus('booked');
      
    } catch (e) {
      toast.error('Booking failed', { description: e?.message || 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading provider information...</p>
        </div>
      </div>
    );
  }

  if (status === 'error' || !provider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Provider Not Found</h2>
          <p className="text-muted-foreground mb-6">The provider you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/providers')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Providers
          </Button>
        </div>
      </div>
    );
  }

  if (bookingStatus === 'booked') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-6">
              Your service has been booked successfully with {provider.full_name || 'Provider'}.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                View Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/providers')} className="w-full">
                Browse More Providers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bookingStatus === 'requested') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Request Sent!</h2>
            <p className="text-muted-foreground mb-6">
              Your booking request has been sent to {provider.full_name || 'Provider'}. They will review and confirm your requested date/time.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                View Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/providers')} className="w-full">
                Browse More Providers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-16">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="container py-4">
          <Button variant="ghost" onClick={() => navigate('/providers')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Providers
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Book Service</h1>
          <p className="text-muted-foreground">Complete your booking details</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Provider Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={provider.imageUrl || provider.avatar_url} />
                    <AvatarFallback className="text-xl">
                      {provider.full_name?.charAt(0)?.toUpperCase() || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{provider.full_name || 'Professional Provider'}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">4.8</span>
                      <span className="text-sm text-muted-foreground">(127 reviews)</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {provider.is_verified ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not Verified</Badge>
                  )}
                </div>

                {provider.professions && provider.professions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Services</h4>
                    <div className="flex flex-wrap gap-1">
                      {provider.professions.map((profession, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {profession.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(provider.phone || provider.email) && (
                  <div className="space-y-2">
                    {provider.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {provider.phone}
                      </div>
                    )}
                    {provider.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {provider.email}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  {provider.is_available ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">Available Now</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Schedule Required</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing Info */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="font-medium">Starting from $50</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emergency Fee</span>
                    <span className="font-medium">+ $25</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Estimated Total</span>
                    <span>$50 - $150</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Service Address *</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter your complete service address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="min-h-[100px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUseLiveLocation}
                      className="w-full sm:w-auto"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Use Live Location
                    </Button>
                  </div>

                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label>Service Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? date.toLocaleDateString() : "Select a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Selection */}
                  <div className="space-y-2">
                    <Label>Preferred Time</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          variant={time === slot ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTime(slot)}
                          className="text-sm"
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Describe your service requirements or special instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          {provider.is_available ? 'Book Now' : 'Send Request'}
                        </div>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/providers')}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  What to Expect
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Quick Response</p>
                      <p className="text-sm text-muted-foreground">Provider will respond within 2 hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Professional Service</p>
                      <p className="text-sm text-muted-foreground">Verified and experienced providers</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Secure Payment</p>
                      <p className="text-sm text-muted-foreground">Pay only after service completion</p>
                    </div>
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
