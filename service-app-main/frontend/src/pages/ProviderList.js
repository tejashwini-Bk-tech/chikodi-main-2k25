import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Filter, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, PROVIDER_DOCS_BUCKET } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

const ProviderList = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const { data, error } = await supabase
          .from('providers')
          .select('provider_id, user_id, professions, is_verified, is_available, location, documents, created_at');
        if (error) throw error;
        const items = data || [];
        console.log('Providers fetched:', items);

        // Get user IDs for fetching names
        const userIds = items.map(p => p.user_id).filter(Boolean);
        console.log('User IDs:', userIds);

        // Fetch names from profiles table
        let profileMap = {};
        if (userIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

          console.log('Profiles query error:', profileError);
          console.log('Profiles fetched:', profiles);

          if (profiles) {
            profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
            console.log('Profile map created:', profileMap);
          }
        }

        // Build display objects and signed URLs for face photos if present
        const withImages = await Promise.all(items.map(async (p) => {
          let imageUrl = '';
          let fullName = profileMap[p.user_id] || 'Provider';

          const facePath = p?.documents?.face_photo;
          if (facePath && typeof facePath === 'string') {
            try {
              const { data: signed, error: sErr } = await supabase.storage.from(PROVIDER_DOCS_BUCKET).createSignedUrl(facePath, 3600);
              if (!sErr && signed?.signedUrl) imageUrl = signed.signedUrl;
            } catch (_) { }
          }

          // Get location address via reverse geocoding
          let locationAddress = 'Location N/A';
          if (typeof p?.location?.lat === 'number' && typeof p?.location?.lng === 'number') {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.location.lat}&lon=${p.location.lng}`
              );
              const geoData = await res.json();
              if (geoData?.address) {
                const addr = geoData.address;
                locationAddress = addr.city || addr.town || addr.village || addr.county || 'Unknown Location';
              }
            } catch (_) {
              locationAddress = `${p.location.lat.toFixed(3)}, ${p.location.lng.toFixed(3)}`;
            }
          }

          return {
            id: p.provider_id,
            name: fullName,
            professions: Array.isArray(p.professions) ? p.professions : [],
            is_verified: !!p.is_verified,
            is_available: !!p.is_available,
            location: p.location || null,
            locationAddress: locationAddress,
            image: imageUrl,
            created_at: p.created_at
          };
        }));
        setProviders(withImages);
        setFilteredProviders(withImages);
        // Derive categories from professions present
        const cats = Array.from(new Set(withImages.flatMap(p => (p.professions[0] ? [p.professions[0]] : []))));
        setCategories(cats);
      } catch (e) {
        console.error('Failed to load providers:', e);
        setProviders([]);
        setFilteredProviders([]);
        setCategories([]);
      }
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    // Filter providers based on search and category
    let filtered = providers;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.professions.join(' ').toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => (p.professions[0] || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    setFilteredProviders(filtered);
  }, [searchQuery, selectedCategory, providers]);

  const handleBookNow = (provider) => {
    toast({
      title: "Booking Request Sent",
      description: `${provider.name} will contact you shortly`,
    });
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Search Header */}
        <div className="mb-8 animate-in fade-in duration-500">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            {t('listSearch')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            {filteredProviders.length} providers available
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 animate-in fade-in duration-700">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-base transition-all duration-200 focus:scale-[1.01]"
            />
          </div>

          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="py-6 px-6 transition-all duration-200 hover:scale-105">
                <Filter className="w-5 h-5 mr-2" />
                {selectedCategory === 'all' ? t('allCategories') : selectedCategory}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem
                onClick={() => setSelectedCategory('all')}
                className={selectedCategory === 'all' ? 'bg-slate-100 dark:bg-slate-800' : ''}
              >
                {t('allCategories')}
              </DropdownMenuItem>
              {categories.map((name) => (
                <DropdownMenuItem
                  key={name}
                  onClick={() => setSelectedCategory(name)}
                  className={selectedCategory === name ? 'bg-slate-100 dark:bg-slate-800' : ''}
                >
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Provider Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider, index) => (
            <Card
              key={provider.id}
              className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                {/* Provider Header */}
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-16 h-16 ring-2 ring-blue-600">
                    <AvatarImage src={provider.image} alt={provider.name} />
                    <AvatarFallback>{(provider.name || 'P')[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{provider.name}</h3>
                      {provider.is_verified && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={provider.is_available ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}>
                        {provider.is_available ? 'Available' : 'Busy'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Services/Professions */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Services Offered:</p>
                  <div className="flex flex-wrap gap-2">
                    {provider.professions.length > 0 ? (
                      provider.professions.map((prof, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {prof.replace('_', ' ')}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No services listed</span>
                    )}
                  </div>
                </div>

                {/* Provider Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{provider.locationAddress}</span>
                  </div>

                  {/* Additional details can be added here (e.g., pricing) once available */}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(`/provider/${provider.id}`)}
                    variant="outline"
                    className="flex-1 transition-all duration-200 hover:scale-105"
                  >
                    {t('viewProfile')}
                  </Button>
                  <Button
                    onClick={() => navigate(`/book/${provider.id}`)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white transition-all duration-200 hover:scale-105"
                  >
                    {t('bookNow')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredProviders.length === 0 && (
          <div className="text-center py-12 animate-in fade-in duration-500">
            <p className="text-xl text-slate-600 dark:text-slate-400">
              No providers found. Try adjusting your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderList;
