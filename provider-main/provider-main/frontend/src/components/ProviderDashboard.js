import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Download, Wallet, User, MapPin, Phone, Mail, Award, Shield, QrCode } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ProviderDashboard = () => {
  const { providerId } = useParams();
  const [provider, setProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProviderData();
  }, [providerId]);

  const fetchProviderData = async () => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('provider_id', providerId)
        .maybeSingle();
      if (error) throw error;
      setProvider(data || null);
    } catch (error) {
      console.error('Failed to fetch provider data:', error);
      toast.error('Failed to load provider data');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadIdCard = async () => {
    try {
      if (!provider?.id_card_path) {
        toast.error('ID card not available');
        return;
      }
      const isBase64 = provider.id_card_path.length > 100 && !provider.id_card_path.includes('/');
      let href = '';
      if (isBase64) {
        href = `data:image/png;base64,${provider.id_card_path}`;
      } else {
        const { data, error } = await supabase.storage.from('provider-docs').createSignedUrl(provider.id_card_path, 60);
        if (error) throw error;
        href = data.signedUrl;
      }
      const link = document.createElement('a');
      link.href = href;
      link.download = `provider-id-${providerId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('ID Card downloaded successfully');
    } catch (error) {
      console.error('Failed to download ID card:', error);
      toast.error('Failed to download ID card');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-shimmer w-96 h-64 rounded-lg"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card border-0 shadow-2xl p-8 text-center">
          <CardTitle className="text-2xl text-red-600 mb-4">Provider Not Found</CardTitle>
          <p className="text-gray-600">The provider ID you're looking for doesn't exist.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-gray-800">Provider Dashboard</h1>
              <p className="text-gray-600">Welcome back, Provider ID: {provider.provider_id}</p>
            </div>
          </div>
          
          {provider.is_verified && (
            <Badge className="professional-badge text-lg px-6 py-2" data-testid="verification-status">
              ✓ Verified Provider
            </Badge>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ID Card */}
          <div className="lg:col-span-1">
            <Card className="id-card border-0 shadow-2xl">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="id-card-header">Service Provider ID</div>
                  
                  <div className="provider-id text-4xl font-black" data-testid="provider-id-display">
                    {provider.provider_id}
                  </div>
                  
                  <Separator className="bg-white/20" />
                  
                  <div className="space-y-2 text-left">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{provider.mobile_number}</span>
                    </div>
                    {provider.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{provider.email}</span>
                        <Badge variant={provider.email_verified ? 'default' : 'secondary'} className="ml-2">
                          {provider.email_verified ? 'Email Verified' : 'Email Unverified'}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <Separator className="bg-white/20" />
                  
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Professions:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.professions.map(profession => (
                        <Badge key={profession} variant="secondary" className="text-xs">
                          {profession.replace('_', ' ').toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {provider.qr_code && (
                    <div className="qr-code-container">
                      <img 
                        src={`data:image/png;base64,${provider.qr_code}`}
                        alt="Provider QR Code"
                        className="w-24 h-24 mx-auto"
                        data-testid="qr-code-image"
                      />
                    </div>
                  )}
                  
                  <Button 
                    onClick={downloadIdCard}
                    className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
                    data-testid="download-id-card-btn"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download ID Card
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet */}
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-6 w-6 text-purple-600" />
                  <span>Wallet</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="wallet-card">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white/80 text-sm font-medium">Current Balance</p>
                        <p className="text-4xl font-bold text-white" data-testid="wallet-balance">
                          ₹{provider.wallet_balance.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-white/60">
                        <Wallet className="h-8 w-8" />
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-white/20">
                      <p className="text-white/80 text-sm">Provider ID: {provider.provider_id}</p>
                      <p className="text-white/60 text-xs mt-1">
                        Member since {new Date(provider.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Status */}
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-6 w-6 text-emerald-600" />
                  <span>Professional Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {provider.professions.map(profession => {
                    const status = provider.professional_status[profession];
                    const isProfessional = status === 'Professional';
                    return (
                      <div key={profession} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-800 capitalize">
                            {profession.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          {isProfessional ? (
                            <Badge className="professional-badge">
                              Professional
                            </Badge>
                          ) : (
                            <Badge className="amateur-badge">
                              Amateur/Freelancer
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Documents Status */}
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <span>Document Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Trade License</span>
                    <Badge variant={provider.has_trade_license ? 'default' : 'secondary'}>
                      {provider.has_trade_license ? '✓ Uploaded' : '✗ Not Uploaded'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Health Permit</span>
                    <Badge variant={provider.has_health_permit ? 'default' : 'secondary'}>
                      {provider.has_health_permit ? '✓ Uploaded' : '✗ Not Uploaded'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Certificates</span>
                    <Badge variant={provider.has_certificates ? 'default' : 'secondary'}>
                      {provider.has_certificates ? '✓ Uploaded' : '✗ Not Uploaded'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">ID Verification</span>
                    <Badge className="professional-badge">
                      ✓ Verified
                    </Badge>
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

export default ProviderDashboard;