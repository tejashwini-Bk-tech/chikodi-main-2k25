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
      console.log('[Account] professions (text[]):', Array.isArray(data?.professions) ? data.professions : data?.professions);
      console.log('[Account] professions type:', typeof data?.professions, 'isArray=', Array.isArray(data?.professions));
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
    // professions is a Postgres text[]; ensure it's an array before mapping
    // and avoid runtime errors when null/undefined
    (() => { return null; })(),
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
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-8">
        {/* Service Provider ID Card (tall) */}
        <Card className="id-card border-0 shadow-2xl w-full min-h-[60vh]">
          <CardContent className="p-6 flex flex-col h-full">
            <div className="text-center space-y-4 flex flex-col h-full">
              <div className="id-card-header text-5xl md:text-6xl font-extrabold">Service Provider ID</div>

              <div className="provider-id text-2xl font-mono font-semibold" data-testid="provider-id-display">
                <span>{(provider.provider_id || '').toString().slice(0, 8)}</span>
              </div>

              <div className="text-xl text-white/90">Member Since {new Date(provider.created_at).toLocaleDateString()}</div>

              <Button
                onClick={downloadIdCard}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 mt-auto"
                data-testid="download-id-card-btn"
              >
                <Download className="mr-2 h-4 w-4" />
                Download ID Card
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Document Status Card */}
        <Card className="glass-card border-0 shadow-2xl w-full">
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
  );
}

export default Account;
