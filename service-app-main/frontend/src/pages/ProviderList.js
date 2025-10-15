import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Filter, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabaseClient';
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
import { toast } from '../hooks/use-toast';

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
          .select('provider_id, professions, is_verified, location, documents, created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const items = data || [];
        // Build display objects and signed URLs for face photos if present
        const withImages = await Promise.all(items.map(async (p) => {
          let imageUrl = '';
          const facePath = p?.documents?.face_photo;
          if (facePath && typeof facePath === 'string') {
            try {
              const { data: signed, error: sErr } = await supabase.storage.from('provider-docs').createSignedUrl(facePath, 3600);
              if (!sErr && signed?.signedUrl) imageUrl = signed.signedUrl;
            } catch (_) {}
          }
          return {
            id: p.provider_id,
            professions: Array.isArray(p.professions) ? p.professions : [],
            is_verified: !!p.is_verified,
            location: p.location || null,
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
                    <AvatarImage src={provider.image} alt={provider.id} />
                    <AvatarFallback>{(provider.professions[0] || 'P')[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{(provider.professions[0] || 'Provider').replace('_',' ')}</h3>
                      {provider.is_verified && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">ID: {provider.id}</p>
                  </div>
                </div>

                {/* Provider Details */}
                <div className="space-y-2 mb-4">
                  
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4" />
                    {typeof provider?.location?.lat === 'number' && typeof provider?.location?.lng === 'number'
                      ? `${provider.location.lat.toFixed(5)}, ${provider.location.lng.toFixed(5)}`
                      : 'Location N/A'}
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