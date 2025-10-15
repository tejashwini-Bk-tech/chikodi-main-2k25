import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, MapPin, CheckCircle2, Phone, Mail, Calendar, Clock, Award } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';

const ProviderProfile = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [status, setStatus] = useState('idle');

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
        // Build face image signed URL if present
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
        console.error('Failed to load provider', e);
        toast.error('Failed to load provider');
        setStatus('error');
      }
    };
    load();
  }, [id, navigate]);

  if (status === 'loading') return (
    <div className="min-h-screen pt-20 pb-12 px-4"><div className="max-w-6xl mx-auto text-slate-600">Loading…</div></div>
  );
  if (!provider) return (
    <div className="min-h-screen pt-20 pb-12 px-4"><div className="max-w-6xl mx-auto text-slate-600">Provider not found.</div></div>
  );

  const reviews = [
    { id: 1, name: 'John Doe', rating: 5, comment: 'Excellent service! Very professional and on time.', date: '2 days ago' },
    { id: 2, name: 'Jane Smith', rating: 5, comment: 'Great work quality. Highly recommended!', date: '1 week ago' },
    { id: 3, name: 'Mike Johnson', rating: 4, comment: 'Good service, will hire again.', date: '2 weeks ago' },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* Provider Header */}
        <Card className="border-0 shadow-lg mb-6 animate-in fade-in duration-500">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-32 h-32 ring-4 ring-blue-600">
                <AvatarImage src={provider.imageUrl} alt={provider.provider_id} />
                <AvatarFallback className="text-4xl">{(provider.professions?.[0] || 'P')[0]}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-3xl font-bold">{(provider.professions?.[0] || 'Provider').replace('_',' ')}</h1>
                      {provider.is_verified && (
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">ID: {provider.provider_id}</p>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4" />
                        {typeof provider?.location?.lat === 'number' && typeof provider?.location?.lng === 'number' ? `${provider.location.lat.toFixed(5)}, ${provider.location.lng.toFixed(5)}` : 'Location N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Joined {new Date(provider.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => navigate(`/book/${provider.provider_id}`)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-6 text-lg transition-all duration-300 hover:scale-[1.02]"
              >
                Book Now
              </Button>
              <Button variant="outline" className="py-6">
                <Phone className="w-5 h-5" />
              </Button>
              <Button variant="outline" className="py-6">
                <Mail className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-700">
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {(provider.about_text || 'No description provided yet.')}
                </p>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-900">
              <CardHeader>
                <CardTitle>Customer Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-sm font-medium">{star}</span>
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <Progress value={star === 5 ? 85 : star === 4 ? 10 : 5} className="h-2" />
                    </div>
                  ))}
                </div>
                {reviews.map((review) => (
                  <div key={review.id} className="pb-4 border-b border-slate-200 dark:border-slate-700 last:border-0">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>{review.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold">{review.name}</p>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{review.date}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Map */}
            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-700">
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent>
                {typeof provider?.location?.lat === 'number' && typeof provider?.location?.lng === 'number' ? (
                  <>
                    <div className="w-full h-64 rounded-lg overflow-hidden border">
                      <iframe
                        title="provider-map"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${provider.location.lat},${provider.location.lng}&z=15&output=embed`}
                      />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400">{provider.location.lat.toFixed(5)}, {provider.location.lng.toFixed(5)}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${provider.location.lat},${provider.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block w-full"
                      >
                        <Button variant="outline" className="w-full">Get Directions</Button>
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-48 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20" />
                    <MapPin className="w-12 h-12 text-blue-600 dark:text-cyan-400 z-10" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Availability */}
            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-900">
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Mon - Fri: 8:00 AM - 6:00 PM</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Sat: 9:00 AM - 4:00 PM</span>
                </div>
                <Separator />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Response time: Usually within 1 hour
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderProfile;