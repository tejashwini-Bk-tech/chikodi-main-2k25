import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../hooks/use-toast';

const Geolocation = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);

  const handleAllowLocation = () => {
    setRequesting(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          localStorage.setItem('userLocation', JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
          toast({
            title: "Location Enabled",
            description: "We'll show you nearby providers",
          });
          setTimeout(() => navigate('/'), 500);
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Could not get your location",
            variant: "destructive"
          });
          setRequesting(false);
        }
      );
    } else {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
      setRequesting(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl flex items-center justify-center mb-4 animate-bounce">
              <MapPin className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {t('geoTitle')}
            </CardTitle>
            <CardDescription className="text-base">
              {t('geoSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Map Illustration */}
            <div className="w-full h-48 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 animate-pulse" />
              <MapPin className="w-16 h-16 text-blue-600 dark:text-cyan-400 z-10 animate-bounce" />
            </div>

            {/* Allow Button */}
            <Button
              onClick={handleAllowLocation}
              disabled={requesting}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-6 text-lg transition-all duration-300 hover:scale-[1.02] animate-pulse"
            >
              {requesting ? 'Requesting...' : t('allowLocation')}
            </Button>

            {/* Skip Button */}
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="w-full font-medium py-6 text-base transition-all duration-300 hover:scale-[1.02] animate-in fade-in duration-700"
            >
              {t('skipForNow')}
            </Button>

            <p className="text-sm text-slate-600 dark:text-slate-400 text-center animate-in fade-in duration-1000">
              {t('enterManually')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Geolocation;