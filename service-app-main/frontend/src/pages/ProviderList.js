import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Filter, CheckCircle2, Star, Users, Calendar, DollarSign, Clock, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, PROVIDER_DOCS_BUCKET } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('rating');
  const [providerLocations, setProviderLocations] = useState({});

  // Geolocation states
  const [liveProviders, setLiveProviders] = useState([]);
  const [liveStatus, setLiveStatus] = useState('idle');
  const [leafletReady, setLeafletReady] = useState(false);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const fetchProviderLocationNames = async (providers) => {
    console.log('=== DEBUG: Fetching provider location names ===');

    const locationPromises = providers.map(async (provider) => {
      if (!provider.location || !provider.location.lat || !provider.location.lng) {
        return { providerId: provider.provider_id, locationName: 'Location Not Available' };
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${provider.location.lat}&lon=${provider.location.lng}&zoom=10&addressdetails=1`
        );

        if (response.ok) {
          const data = await response.json();
          const address = data.address;

          let locationName = 'Unknown Location';

          if (address.city || address.town || address.village) {
            locationName = `${address.city || address.town || address.village}`;
            if (address.state) locationName += `, ${address.state}`;
            if (address.country) locationName += `, ${address.country}`;
          } else if (address.county) {
            locationName = address.county;
          } else if (address.country) {
            locationName = address.country;
          }

          return { providerId: provider.provider_id, locationName };
        } else {
          return { providerId: provider.provider_id, locationName: 'Location Unavailable' };
        }
      } catch (error) {
        console.error(`Error fetching location for provider ${provider.provider_id}:`, error);
        return { providerId: provider.provider_id, locationName: 'Location Error' };
      }
    });

    try {
      const locationResults = await Promise.all(locationPromises);
      const locationMap = locationResults.reduce((acc, result) => {
        acc[result.providerId] = result.locationName;
        return acc;
      }, {});

      console.log('=== DEBUG: Location names fetched ===');
      console.log('Location Map:', locationMap);

      setProviderLocations(locationMap);
    } catch (error) {
      console.error('Error fetching provider locations:', error);
    }
  };

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);

        console.log('=== DEBUG: Starting provider fetch ===');
        console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
        console.log('Supabase Key available:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);

        // First try to fetch from providers table
        const { data, error, count } = await supabase
          .from('providers')
          .select('provider_id, user_id, professions, is_verified, is_available, location, documents, created_at', { count: 'exact' });

        console.log('=== DEBUG: Supabase Query Results ===');
        console.log('Error:', error);
        console.log('Data:', data);
        console.log('Count:', count);
        console.log('Data length:', data?.length);

        let items = [];

        if (error) {
          console.log('Providers table error, using mock data:', error.message);
          console.log('Error details:', error);

          // If it's a column error, try without problematic columns
          if (error.message.includes('column') && error.message.includes('does not exist')) {
            console.log('=== DEBUG: Retrying with basic columns ===');
            const { data: retryData, error: retryError } = await supabase
              .from('providers')
              .select('provider_id, user_id, professions, is_verified, is_available, location, created_at', { count: 'exact' });

            if (!retryError && retryData) {
              items = retryData;
              console.log('=== DEBUG: Retry successful ===');
            } else {
              // Use mock data if retry also fails
              items = [];
            }
          } else {
            // Use mock data for other errors
            items = [];
          }
        } else {
          items = data || [];
          console.log('=== DEBUG: Successfully fetched providers ===');
          console.log('Providers found:', items.length);
          items.forEach((provider, index) => {
            console.log(`Provider ${index + 1}:`, {
              provider_id: provider.provider_id,
              user_id: provider.user_id,
              professions: provider.professions,
              is_verified: provider.is_verified,
              is_available: provider.is_available
            });
          });
        }

        // Get user IDs for fetching names
        const userIds = items.map(p => p.user_id).filter(Boolean);
        console.log('=== DEBUG: User IDs to fetch profiles ===');
        console.log('User IDs:', userIds);

        // Fetch names from profiles table
        let profileMap = {};
        if (userIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, phone, avatar_url')
            .in('id', userIds);

          console.log('=== DEBUG: Profiles Query Results ===');
          console.log('Profile Error:', profileError);
          console.log('Profile Data:', profiles);
          console.log('Profile Data length:', profiles?.length);

          if (!profileError && profiles) {
            profileMap = profiles.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {});
            console.log('=== DEBUG: Profile Map Created ===');
            console.log('Profile Map:', profileMap);
          }
        }

        // Add mock profiles for mock providers (only if we have real data but no profiles)
        if (items.length > 0 && !profileMap[items[0].user_id]) {
          console.log('=== DEBUG: Adding fallback profiles ===');
          items.forEach((provider, index) => {
            profileMap[provider.user_id] = {
              full_name: `Provider ${index + 1}`,
              phone: '',
              avatar_url: ''
            };
          });
        }

        // Combine provider data with profile data
        const enrichedProviders = items.map(provider => ({
          ...provider,
          profile: profileMap[provider.user_id] || { full_name: 'Professional Provider', phone: '', avatar_url: '' },
          rating: provider.rating || Math.random() * 2 + 3, // Fallback rating
          total_bookings: provider.total_bookings || Math.floor(Math.random() * 100) + 10,
          avg_response_time: provider.avg_response_time || Math.floor(Math.random() * 60) + 15
        }));

        console.log('=== DEBUG: Enriched Providers ===');
        console.log('Enriched Providers:', enrichedProviders);

        // Extract unique categories
        const allCategories = new Set();
        enrichedProviders.forEach(provider => {
          if (provider.professions && Array.isArray(provider.professions)) {
            provider.professions.forEach(profession => allCategories.add(profession));
          }
        });

        console.log('=== DEBUG: Categories Extracted ===');
        console.log('Categories:', Array.from(allCategories));

        setProviders(enrichedProviders);
        setCategories(Array.from(allCategories));
        setFilteredProviders(enrichedProviders);

        // Fetch location names for providers
        await fetchProviderLocationNames(enrichedProviders);

        // Only show error toast if it's a real error with no data
        if (error && items.length === 0) {
          console.error('Error fetching providers:', error);
          toast.error('Failed to load providers');
        }
      } catch (error) {
        console.error('=== DEBUG: CATCH BLOCK ERROR ===');
        console.error('Error fetching providers:', error);
        console.error('Error stack:', error.stack);
        toast.error('Failed to load providers');

        // Set mock data as fallback only if completely empty
        if (items.length === 0) {
          console.log('=== DEBUG: No providers found, using mock data ===');
          const mockProviders = [
            {
              provider_id: '00000000-0000-0000-0000-000000000001',
              user_id: '00000000-0000-0000-0000-000000000001',
              professions: ['plumbing', 'electrical'],
              is_verified: true,
              is_available: true,
              location: { lat: 20.5937, lng: 78.9629 },
              created_at: new Date().toISOString(),
              profile: { full_name: 'John Smith', phone: '+1234567890', avatar_url: '' }
            },
            {
              provider_id: '00000000-0000-0000-0000-000000000002',
              user_id: '00000000-0000-0000-0000-000000000002',
              professions: ['cleaning', 'gardening'],
              is_verified: false,
              is_available: true,
              location: { lat: 19.0760, lng: 72.8777 },
              created_at: new Date().toISOString(),
              profile: { full_name: 'Sarah Johnson', phone: '+0987654321', avatar_url: '' }
            }
          ];

          setProviders(mockProviders);
          setFilteredProviders(mockProviders);
          setCategories(['plumbing', 'electrical', 'cleaning', 'gardening']);
        }
      } finally {
        setLoading(false);
        console.log('=== DEBUG: Fetch Complete ===');
      }
    };

    fetchProviders();
  }, []);

  // Load providers with location and subscribe for realtime updates (same as Geolocation page)
  useEffect(() => {
    let channel;
    const load = async () => {
      try {
        setLiveStatus('loading');
        const { data, error } = await supabase
          .from('providers')
          .select('provider_id, professions, location, last_location_at, is_verified')
          .not('location', 'is', null)
          .order('last_location_at', { ascending: false });
        if (error) throw error;
        setLiveProviders(data || []);
        setLiveStatus('success');
      } catch (e) {
        setLiveStatus('error');
      }
      try {
        channel = supabase
          .channel('realtime-providers-geo')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'providers' }, (payload) => {
            const row = payload.new || payload.old;
            if (!row) return;
            setLiveProviders((prev) => {
              const idx = prev.findIndex((p) => p.provider_id === row.provider_id);
              if (payload.eventType === 'DELETE') {
                if (idx === -1) return prev;
                const copy = prev.slice();
                copy.splice(idx, 1);
                return copy;
              }
              const nextRow = {
                provider_id: row.provider_id,
                professions: row.professions || [],
                location: row.location || null,
                last_location_at: row.last_location_at || null,
                is_verified: !!row.is_verified,
              };
              if (idx === -1) return [nextRow, ...prev];
              const copy = prev.slice();
              copy[idx] = nextRow;
              return copy;
            });
          })
          .subscribe();
      } catch (_) { }
    };
    load();
    return () => { try { channel && supabase.removeChannel(channel); } catch (_) { } };
  }, []);

  // Dynamically load Leaflet CSS/JS once (same as Geolocation page)
  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    // CSS
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // JS
    const jsId = 'leaflet-js';
    if (!document.getElementById(jsId)) {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletReady(true);
      script.onerror = () => toast.error('Map failed to load');
      document.body.appendChild(script);
    } else {
      setLeafletReady(true);
    }
  }, []);

  // Initialize map once Leaflet is ready (same as Geolocation page)
  useEffect(() => {
    if (!leafletReady || !mapEl.current || mapRef.current) return;
    const L = window?.L;
    if (!L) return; // wait until Leaflet is actually on window
    mapRef.current = L.map(mapEl.current).setView([20.5937, 78.9629], 5); // India default
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);
  }, [leafletReady]);

  // Update markers when providers change (same as Geolocation page)
  useEffect(() => {
    const L = window?.L;
    if (!leafletReady || !mapRef.current || !L) return;
    const map = mapRef.current;
    const markers = markersRef.current;

    // Maintain a set of current IDs
    const ids = new Set();
    for (const p of liveProviders) {
      const id = p.provider_id;
      ids.add(id);
      const hasCoords = typeof p?.location?.lat === 'number' && typeof p?.location?.lng === 'number';
      if (!hasCoords) continue;
      const latlng = [p.location.lat, p.location.lng];
      const label = (p.professions?.[0] || 'Provider').replace('_', ' ');
      const popup = `${label}<br/>Updated: ${p.last_location_at ? new Date(p.last_location_at).toLocaleTimeString() : ''}`;
      if (markers[id]) {
        markers[id].setLatLng(latlng).setPopupContent(popup);
      } else {
        markers[id] = L.marker(latlng).addTo(map).bindPopup(popup);
      }
    }
    // Remove markers for providers no longer present
    Object.keys(markers).forEach((id) => {
      if (!ids.has(id)) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    });
    // Fit bounds to markers
    const latlngs = Object.values(markers).map(m => m.getLatLng());
    if (latlngs.length) {
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds.pad(0.2));
    }
  }, [liveProviders, leafletReady]);

  useEffect(() => {
    let filtered = providers;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(provider =>
        provider.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.professions?.some(profession =>
          profession.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(provider =>
        provider.professions?.includes(selectedCategory)
      );
    }

    // Sort providers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'bookings':
          return (b.total_bookings || 0) - (a.total_bookings || 0);
        case 'response_time':
          return (a.avg_response_time || Infinity) - (b.avg_response_time || Infinity);
        case 'verified':
          return (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0);
        default:
          return 0;
      }
    });

    setFilteredProviders(filtered);
  }, [providers, searchQuery, selectedCategory, sortBy]);

  const handleBookNow = (providerId) => {
    navigate(`/book/${providerId}`);
  };

  const handleViewProfile = (providerId) => {
    navigate(`/provider/${providerId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-5">
      {/* Back Button - Outside Header */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>
      
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="container sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Find Professional Services</h1>
              <p className="text-muted-foreground">Connect with verified service providers in your area</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search providers or services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy('rating')}>
                    <Star className="w-4 h-4 mr-2" /> Highest Rated
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('bookings')}>
                    <Users className="w-4 h-4 mr-2" /> Most Bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('response_time')}>
                    <Clock className="w-4 h-4 mr-2" /> Fast Response
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('verified')}>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Verified First
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="whitespace-nowrap"
            >
              All Services
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap capitalize"
              >
                {category.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Provider Grid */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredProviders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No providers found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or filters
            </p>
            <Button onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Card key={provider.provider_id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={provider.profile?.avatar_url} />
                        <AvatarFallback>
                          {provider.profile?.full_name?.charAt(0)?.toUpperCase() || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {provider.profile?.full_name || 'Unknown Provider'}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium ml-1">
                              {provider.rating?.toFixed(1) || '4.5'}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            ({provider.total_bookings || 0} bookings)
                          </span>
                        </div>
                      </div>
                    </div>
                    {provider.is_verified && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Services */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Services</h4>
                    <div className="flex flex-wrap gap-1">
                      {provider.professions?.slice(0, 3).map((profession, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {profession.replace('_', ' ')}
                        </Badge>
                      ))}
                      {provider.professions?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{provider.professions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Response Time</p>
                        <p className="text-sm font-medium">{provider.avg_response_time || 30} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Available</p>
                        <p className="text-sm font-medium">
                          {provider.is_available ? 'Now' : 'Busy'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  {provider.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {providerLocations[provider.provider_id] || 'Loading location...'}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleBookNow(provider.provider_id)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Book Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleViewProfile(provider.provider_id)}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderList;
