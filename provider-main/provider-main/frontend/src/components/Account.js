import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { Download, User, MapPin, Phone, Mail, Award, Shield, QrCode, ArrowLeft, Edit, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function Account() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });

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
      console.log('[Account] providers fetch result:', data);
      setProvider(data || null);
    } catch (error) {
      console.error('Failed to fetch provider data:', error);
      toast.error('Failed to load provider data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (provider?.provider_id) {
      fetchProfileData(provider.provider_id);
    }
  }, [provider?.provider_id]);

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  const saveProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: provider.provider_id,
          full_name: editForm.full_name,
          phone: editForm.phone,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      setProfile(prev => ({
        ...prev,
        full_name: editForm.full_name,
        phone: editForm.phone
      }));

      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (e) {
      console.error('Failed to update profile:', e);
      toast.error('Failed to update profile');
    }
  };

  const cancelEdit = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || ''
    });
    setIsEditing(false);
  };

  const fetchProfileData = async (profileId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', profileId)
        .maybeSingle();
      if (error) throw error;
      console.log('[Account] profiles fetch result:', data);
      console.log('[Account] Full name:', data?.full_name);
      console.log('[Account] Phone:', data?.phone);
      setProfile(data || null);
    } catch (e) {
      console.error('Failed to fetch profile data:', e);
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <Button
          onClick={() => navigate(`/dashboard/${providerId}`)}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Account</h1>
          <p className="text-gray-600">Manage your account information and documents</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ID Card */}
          <div className="order-1">
            <Card className="id-card border-0 shadow-2xl h-fit">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="id-card-header">Service Provider ID</div>

                  <div className="provider-id text-sm font-semibold group cursor-pointer" data-testid="provider-id-display" title={provider.provider_id}>
                    <span className="group-hover:hidden">
                      {provider.provider_id.substring(0, 9)}...
                    </span>
                    <span className="hidden group-hover:inline">
                      {provider.provider_id}
                    </span>
                  </div>

                  <Separator className="bg-white/20" />

                  <div className="space-y-2 text-left">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">{profile?.full_name || '—'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{profile?.phone || provider.mobile_number}</span>
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

          {/* Account Details */}
          <div className="order-2 space-y-6">
            {/* Personal Information */}
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-6 w-6 text-emerald-600" />
                    <span>Personal Information</span>
                  </CardTitle>
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={saveProfile}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        onClick={cancelEdit}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    {isEditing ? (
                      <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter your full name"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{profile?.full_name || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    {isEditing ? (
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-gray-900 mt-1">{profile?.phone || provider.mobile_number || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-900">{provider.email || 'Not provided'}</p>
                      {provider.email_verified && (
                        <Badge variant="default" className="text-xs">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    {!provider.email_verified && (
                      <p className="text-xs text-gray-500 mt-1">Email verification pending</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Member Since</label>
                    <p className="text-gray-900 mt-1">{new Date(provider.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-6 w-6 text-emerald-600" />
                  <span>Professional Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {provider.professions.map(profession => {
                    const status = provider.professional_status[profession];
                    const isProfessional = status === 'Professional';
                    return (
                      <div key={profession} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800 capitalize">
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

            {/* Document Status */}
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <span>Document Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Trade License</span>
                    <Badge variant={provider.has_trade_license ? 'default' : 'secondary'}>
                      {provider.has_trade_license ? '✓ Uploaded' : '✗ Not Uploaded'}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Health Permit</span>
                    <Badge variant={provider.has_health_permit ? 'default' : 'secondary'}>
                      {provider.has_health_permit ? '✓ Uploaded' : '✗ Not Uploaded'}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Certificates</span>
                    <Badge variant={provider.has_certificates ? 'default' : 'secondary'}>
                      {provider.has_certificates ? '✓ Uploaded' : '✗ Not Uploaded'}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
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
}

export default Account;
