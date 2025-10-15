import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Webcam from 'react-webcam';
import FaceRecognition from './FaceRecognition';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Camera, Upload, FileText, User, Phone, Mail, Shield, Award, Briefcase } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

 const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
 const API = `${BACKEND_URL}/api`;

const PROFESSIONS = [
  { id: 'electrician', name: 'Electrician' },
  { id: 'carpenter', name: 'Carpenter' },
  { id: 'plumber', name: 'Plumber' },
  { id: 'locksmith', name: 'Key Maker / Locksmith' },
  { id: 'gardener', name: 'Gardener' },
  { id: 'photographer', name: 'Photographer' },
  { id: 'videographer', name: 'Videographer' },
  { id: 'hairstylist', name: 'Hairstylist' },
  { id: 'makeup_artist', name: 'Makeup Artist' },
  { id: 'massage_therapist', name: 'Massage Therapist (Spa)' },
  { id: 'henna_artist', name: 'Henna Artist' },
  { id: 'caterer', name: 'Caterer' }
];

const ProviderRegistration = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const { step } = useParams();
  const location = useLocation();
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationRequested, setEmailVerificationRequested] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60); // 2 minutes countdown
  const [otpExpired, setOtpExpired] = useState(false);


  useEffect(() => {
    if (mobileOtpSent && otpTimer > 0 && !mobileVerified) {
      const timerId = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timerId);
    } else if (otpTimer === 0) {
      setOtpExpired(true);
    }
  }, [mobileOtpSent, otpTimer, mobileVerified]);

  // Sync currentStep from URL param when present
  useEffect(() => {
    if (step) {
      const n = parseInt(step, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 4 && n !== currentStep) {
        setCurrentStep(n);
      }
    }
  }, [step]);

  // If loaded at /register (no step), redirect to step/1
  useEffect(() => {
    if (!step && location.pathname === '/register') {
      navigate('/register/step/1', { replace: true });
    }
  }, [step, location.pathname]);



  const [formData, setFormData] = useState({
    email: '',
    mobile_number: '',
    professions: [],
    trade_license: null,
    health_permit: null,
    certificates: [],
    work_sample: null,
    aadhaar_card: null,
    pan_card: null,
    face_photo: null
  });

  // Move auth-state listener below formData initialization to avoid TDZ errors
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionEmail = (session?.user?.email || '').trim().toLowerCase();
      const inputEmail = (formData.email || '').trim().toLowerCase();
      // Only mark verified if user requested verification AND the session email matches the current input
      if (emailVerificationRequested && inputEmail && sessionEmail && sessionEmail === inputEmail) {
        setEmailVerified(true);
        setEmailOtpSent(false);
        setEmailVerificationRequested(false);
        // reset the field after successful verification of the same email
        setFormData(prev => ({ ...prev, email: '' }));
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [emailVerificationRequested, formData.email]);

  // Proactively check Supabase for email confirmation and mark as verified when it matches the entered email.
  // This helps ensure the Verified badge appears after the magic link flow without relying on localStorage or same-browser state.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10; // ~10s polling max

    async function pollForConfirmation() {
      try {
        const { data } = await supabase.auth.getUser({ forceRefresh: true });
        const u = data?.user;
        const sessionEmail = (u?.email || '').trim().toLowerCase();
        const inputEmail = (formData.email || '').trim().toLowerCase();
        const confirmed = !!(u?.email_confirmed_at);

        if (!cancelled && confirmed && inputEmail && sessionEmail && sessionEmail === inputEmail) {
          setEmailVerified(true);
          setEmailOtpSent(false);
          setEmailVerificationRequested(false);
        }
      } catch (_) {
        // ignore transient errors
      } finally {
        if (!cancelled && !emailVerified && attempts++ < maxAttempts) {
          setTimeout(pollForConfirmation, 1000);
        }
      }
    }

    // Start polling only after user initiated verification, with an input email present and not yet verified
    if (emailVerificationRequested && (formData.email || '').trim() && !emailVerified) {
      pollForConfirmation();
    }

    return () => {
      cancelled = true;
    };
  }, [formData.email, emailVerified, emailVerificationRequested]);

  const [uploadedFiles, setUploadedFiles] = useState({
    trade_license: null,
    health_permit: null,
    certificates: [],
    work_sample: null,
    aadhaar_card: null,
    pan_card: null
  });

  const requiresTradeLicense = () => {
    return formData.professions.some(prof =>
      ['photographer', 'videographer', 'hairstylist', 'makeup_artist', 'massage_therapist', 'henna_artist', 'locksmith'].includes(prof)
    );
  };

  const requiresHealthPermit = () => {
    return formData.professions.some(prof =>
      ['hairstylist', 'makeup_artist', 'massage_therapist', 'henna_artist'].includes(prof)
    );
  };

  const isLocksmiths = () => {
    return formData.professions.includes('locksmith');
  };

  const handleFileUpload = async (file, fieldName) => {
    if (!file) return null;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    try {
      const base64 = await handleFileUpload(file, fieldName);

      if (fieldName === 'certificates') {
        setFormData(prev => ({
          ...prev,
          certificates: [...(prev.certificates || []), base64]
        }));
        setUploadedFiles(prev => ({
          ...prev,
          certificates: [...(prev.certificates || []), file.name]
        }));
      } else {
        setFormData(prev => ({ ...prev, [fieldName]: base64 }));
        setUploadedFiles(prev => ({ ...prev, [fieldName]: file.name }));
      }

      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload file');
    }
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    const base64 = imageSrc.split(',')[1];
    setFormData(prev => ({ ...prev, face_photo: base64 }));
    setShowCamera(false);
    toast.success('Face photo captured successfully');
  };

  const handleProfessionChange = (profession, checked) => {
    setFormData(prev => ({
      ...prev,
      professions: checked
        ? [...prev.professions, profession]
        : prev.professions.filter(p => p !== profession)
    }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:

        if (!formData.mobile_number || formData.professions.length === 0) {
          toast.error('Please fill in mobile number and select at least one profession');
          return false;
        }
        // basic mobile validation: 10 digits
        if (!/^\d{10}$/.test(formData.mobile_number)) {
          toast.error('Please enter a valid 10-digit mobile number');
          return false;
        }
        // if email provided, validate format only (no verification required)
        if (formData.email && !/^\S+@\S+\.[\S]+$/.test(formData.email)) {
          toast.error('Please enter a valid email address');
          return false;
        }
        return true;

        // Add similar email OTP verification logic if email is provided
        return true;

        return true;
      case 2:
        if (requiresTradeLicense() && isLocksmiths() && !formData.trade_license) {
          toast.error('Trade License is mandatory for Locksmiths');
          return false;
        }
        if (!formData.work_sample) {
          toast.error('Please upload your best work sample');
          return false;
        }
        return true;
      case 3:
        if (!formData.aadhaar_card || !formData.pan_card) {
          toast.error('Please upload both Aadhaar and PAN card');
          return false;
        }
        return true;
      case 4:
        if (!formData.face_photo) {
          toast.error('Please capture your face photo');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      const newStep = Math.min(currentStep + 1, 4);
      setCurrentStep(newStep);
      navigate(`/register/step/${newStep}`);
    }
  };

  const prevStep = () => {
    const newStep = Math.max(currentStep - 1, 1);
    setCurrentStep(newStep);
    navigate(`/register/step/${newStep}`);
  };

  const submitRegistration = async () => {
    if (!validateStep()) return;

    setIsLoading(true);
    try {
      let sessionUser = null;
      try {
        const { data } = await supabase.auth.getUser();
        sessionUser = data?.user || null;
      } catch (_) {}
      if (!sessionUser) {
        const { error: anonErr } = await supabase.auth.signInAnonymously();
        if (anonErr) throw anonErr;
      }
      const toBlob = (b64) => {
        const byteChars = atob(b64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'image/jpeg' });
      };
      const folder = `provider-${Date.now()}`;
      const upload = async (b64, filename) => {
        if (!b64) return null;
        const path = `${folder}/${filename}`;
        const { error } = await supabase.storage.from('provider-docs').upload(path, toBlob(b64), { upsert: true, contentType: 'image/jpeg' });
        if (error) throw error;
        return path;
      };

      const documents = {};
      documents.trade_license = await upload(formData.trade_license, 'trade_license.jpg');
      documents.health_permit = await upload(formData.health_permit, 'health_permit.jpg');
      const certs = [];
      if (Array.isArray(formData.certificates)) {
        for (let i = 0; i < formData.certificates.length; i++) {
          const p = await upload(formData.certificates[i], `certificate_${i + 1}.jpg`);
          if (p) certs.push(p);
        }
      }
      documents.certificates = certs;
      documents.work_sample = await upload(formData.work_sample, 'work_sample.jpg');
      documents.aadhaar_card = await upload(formData.aadhaar_card, 'aadhaar_card.jpg');
      documents.pan_card = await upload(formData.pan_card, 'pan_card.jpg');
      documents.face_photo = await upload(formData.face_photo, 'face_photo.jpg');

      const has_trade_license = !!documents.trade_license;
      const has_health_permit = !!documents.health_permit;
      const has_certificates = Array.isArray(documents.certificates) && documents.certificates.length > 0;

      const professional_status = {};
      for (const profession of formData.professions) {
        if (['photographer','videographer','massage_therapist','hairstylist','henna_artist','makeup_artist'].includes(profession)) {
          if (!has_trade_license || (['massage_therapist','hairstylist','henna_artist','makeup_artist'].includes(profession) && !has_health_permit)) {
            professional_status[profession] = 'Amateur/Freelancer';
          } else {
            professional_status[profession] = 'Professional';
          }
        } else {
          professional_status[profession] = 'Professional';
        }
      }

      let user_id = null;
      try { const { data } = await supabase.auth.getUser(); user_id = data?.user?.id || null; } catch (_) {}

      const insertRow = {
        email: formData.email || null,
        mobile_number: formData.mobile_number,
        professions: formData.professions,
        has_trade_license,
        has_health_permit,
        has_certificates,
        professional_status,
        documents,
        is_verified: true,
        verification_date: new Date().toISOString(),
        user_id: user_id || undefined
      };

      const { data: inserted, error } = await supabase.from('providers').insert(insertRow).select('*').single();
      if (error) throw error;

      toast.success('Registration successful! Redirecting to your dashboard...');
      setTimeout(() => {
        navigate(`/dashboard/${inserted.provider_id}`);
      }, 2000);
    } catch (error) {
      console.error('Registration failed:', error);
      let msg = 'Registration failed. Please try again.';
      const detail = error?.response?.data?.detail;
      if (Array.isArray(detail)) {
        msg = detail.map(e => e?.msg || e).join('; ');
      } else if (typeof detail === 'string') {
        msg = detail;
      } else if (typeof error?.message === 'string') {
        msg = error.message;
      }
      try { toast.error(msg); } catch (_) { }
    } finally {
      setIsLoading(false);
    }
  };

  //mobile
  const sendMobileOtp = async () => {
    if (!formData.mobile_number) return;
    try {
      await axios.post('https://heytejuu.app.n8n.cloud/webhook/otp-send', {
        mobile_number: formData.mobile_number
      }, { headers: { 'Content-Type': 'application/json' } });
      setMobileOtpSent(true);
      setOtpTimer(60);        // reset timer
      setOtpExpired(false);    // reset expiry flag
      toast.success('OTP sent to your mobile number');
    } catch (error) {
      toast.error('Failed to send OTP');
    }
  };

  const resendMobileOtp = async () => {
    if (!formData.mobile_number) return;
    try {
      await axios.post('https://heytejuu.app.n8n.cloud/webhook/otp-send', {
        mobile_number: formData.mobile_number
      }, { headers: { 'Content-Type': 'application/json' } });
      setMobileOtpSent(true);
      setOtpTimer(60);
      setOtpExpired(false);
      toast.success('OTP resent to your mobile number');
    } catch (error) {
      toast.error('Failed to resend OTP');
    }
  };



  const verifyMobileOtp = async () => {
    if (!/^\d{6}$/.test(mobileOtp)) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    try {
      // Call API to verify OTP
      const response = await axios.post('https://heytejuu.app.n8n.cloud/webhook/validate', {
        mobile_number: formData.mobile_number,
        otp: mobileOtp
      
      });
        console.log(response.data);
      if (response.data.verified) {
        setMobileVerified(true);
        toast.success('Mobile number verified');
      } else {
        setMobileVerified(false);
        setMobileOtp('');
        setMobileOtpSent(false);
        setFormData(prev => ({ ...prev, mobile_number: '' }));
        toast.error('Invalid OTP');
      }
    } catch (error) {
      const message =
        (error?.response && (error.response.data?.detail || error.response.data?.message)) ||
        error?.message ||
        'OTP verification failed';
      setMobileVerified(false);
      setMobileOtp('');
      setMobileOtpSent(false);
      setFormData(prev => ({ ...prev, mobile_number: '' }));
      toast.error(message);
    }
  };

  // email varificaiton

  const sendEmailOtp = async () => {
    const email = (formData.email || '').trim().toLowerCase();
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) {
      toast.error(error.message || 'Failed to send verification email');
      return;
    }
    setEmailOtpSent(true);
    setEmailVerificationRequested(true);
    toast.success('Verification email sent');
  };

  // Removed legacy verifyEmailOtp (OTP) in favor of Supabase Magic Link flow



  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 p-3 bg-emerald-100 rounded-full w-fit">
                <User className="h-8 w-8 text-emerald-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-800">Basic Information</CardTitle>
              <p className="text-gray-600">Let's start with your contact details and profession</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mobile" className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Mobile Number *
                  {mobileVerified && (
                    <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">Verified</Badge>
                  )}
                </Label>
                <div className="flex space-x-2 items-center">
                  <Input
                    id="mobile"
                    data-testid="mobile-input"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={formData.mobile_number}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, mobile_number: e.target.value }));
                      setMobileOtpSent(false);
                      setMobileOtp('');
                      setMobileVerified(false);
                    }}
                    disabled={mobileVerified}
                    className="h-12 text-lg flex-grow"
                  />
                  <Button
                    onClick={sendMobileOtp}
                    disabled={!formData.mobile_number || mobileOtpSent}
                    className="h-12 px-4"
                    data-testid="send-mobile-otp-btn"
                  >
                    {mobileOtpSent ? 'OTP Sent' : 'Send OTP'}
                  </Button>
                </div>

                {mobileOtpSent && !mobileVerified && (
                  <>
                    <Input
                      type="text"
                      placeholder="Enter OTP"
                      value={mobileOtp}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setMobileOtp(val);
                      }}
                      disabled={otpExpired}
                      maxLength={6}
                      className="h-12 text-lg mt-2"
                      data-testid="mobile-otp-input"
                    />
                    <div className="flex items-center gap-3 mt-2">
                      <Button
                        onClick={verifyMobileOtp}
                        disabled={otpExpired || mobileOtp.length !== 6}
                        className="h-10 px-4"
                        data-testid="verify-mobile-otp-btn"
                      >
                        Verify OTP
                      </Button>
                      {!otpExpired ? (
                        <p className="text-sm text-gray-600">Time remaining: {otpTimer}s</p>
                      ) : (
                        <p className="text-sm text-red-600">OTP expired.</p>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setOtpTimer(60);
                        setOtpExpired(false);
                        resendMobileOtp();
                      }}
                      disabled={!otpExpired}
                      className="mt-2"
                      data-testid="resend-otp-btn"
                    >
                      Resend OTP
                    </Button>
                  </>
                )}


                {/* {mobileVerified && (
                  <p className="text-green-600 mt-1">Mobile number verified successfully</p>
                )} */}
              </div>


              {/* //email// */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                  {emailVerified && (
                    <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">Verified</Badge>

)}
                </Label>
                <div className="flex space-x-2 items-center">
                  <Input
                    id="email"
                    data-testid="email-input"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, email: e.target.value }));
                      setEmailOtpSent(false);
                      setEmailVerified(false);
                    }}
                    disabled={emailVerified}
                    className="h-12 text-lg flex-grow"
                  />
                  <Button
                    onClick={sendEmailOtp}
                    disabled={!formData.email || emailOtpSent || emailVerified}
                    className="h-12 px-4"
                    data-testid="validate-email-btn"
                  >
                    {emailVerified ? 'Verified' : (emailOtpSent ? 'Email Sent' : 'Send Verification Email')}
                  </Button>
                </div>

                
                {/* {emailVerified && (
                  <p className="text-green-600 mt-1 font-medium">Email verified</p>
                )} */}
              </div>


              <div className="space-y-4">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Select Your Professions * (You can select multiple)
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PROFESSIONS.map((profession) => (
                    <div key={profession.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <Checkbox
                        id={profession.id}
                        data-testid={`profession-${profession.id}`}
                        checked={formData.professions.includes(profession.id)}
                        onCheckedChange={(checked) => handleProfessionChange(profession.id, checked)}
                      />
                      <Label htmlFor={profession.id} className="text-sm font-medium cursor-pointer">
                        {profession.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.professions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected Professions:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.professions.map(profId => {
                      const prof = PROFESSIONS.find(p => p.id === profId);
                      return (
                        <Badge key={profId} variant="secondary" className="px-3 py-1">
                          {prof?.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-800">Professional Documents</CardTitle>
              <p className="text-gray-600">Upload your professional credentials and work samples</p>
            </CardHeader>
            <CardContent className="space-y-8">
              {requiresTradeLicense() && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Trade License and Shops Act {isLocksmiths() ? '(Mandatory)' : '(Optional)'}
                  </Label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'trade_license')}
                      className="hidden"
                      id="trade-license"
                      data-testid="trade-license-upload"
                    />
                    <label htmlFor="trade-license" className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-700">
                        {uploadedFiles.trade_license ? uploadedFiles.trade_license : 'Click to upload Trade License'}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                    </label>
                  </div>
                </div>
              )}

              {requiresHealthPermit() && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Health and Hygiene Permits (Optional)
                  </Label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'health_permit')}
                      className="hidden"
                      id="health-permit"
                      data-testid="health-permit-upload"
                    />
                    <label htmlFor="health-permit" className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-700">
                        {uploadedFiles.health_permit ? uploadedFiles.health_permit : 'Click to upload Health Permit'}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Professional Certificates (Optional)
                </Label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'certificates')}
                    className="hidden"
                    id="certificates"
                    multiple
                    data-testid="certificates-upload"
                  />
                  <label htmlFor="certificates" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700">Click to upload Certificates</p>
                    <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB (Multiple files allowed)</p>
                  </label>
                </div>
                {uploadedFiles.certificates.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Certificates:</p>
                    <div className="space-y-1">
                      {uploadedFiles.certificates.map((filename, index) => (
                        <p key={index} className="text-sm text-green-600">✓ {filename}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Best Work Sample * (Mandatory)
                </Label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'work_sample')}
                    className="hidden"
                    id="work-sample"
                    data-testid="work-sample-upload"
                  />
                  <label htmlFor="work-sample" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                      {uploadedFiles.work_sample ? uploadedFiles.work_sample : 'Upload your best work image'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-800">Identity Verification</CardTitle>
              <p className="text-gray-600">Upload your government issued ID proofs</p>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Aadhaar Card * (Mandatory)</Label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'aadhaar_card')}
                    className="hidden"
                    id="aadhaar-card"
                    data-testid="aadhaar-upload"
                  />
                  <label htmlFor="aadhaar-card" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                      {uploadedFiles.aadhaar_card ? uploadedFiles.aadhaar_card : 'Upload Aadhaar Card'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">PAN Card * (Mandatory)</Label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'pan_card')}
                    className="hidden"
                    id="pan-card"
                    data-testid="pan-upload"
                  />
                  <label htmlFor="pan-card" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                      {uploadedFiles.pan_card ? uploadedFiles.pan_card : 'Upload PAN Card'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                <Camera className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-800">Face Recognition</CardTitle>
              <p className="text-gray-600">Capture your face photo for identity verification</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {!showCamera && !formData.face_photo && (
                <div className="text-center space-y-4">
                  <Button
                    onClick={() => setShowCamera(true)}
                    className="btn-primary h-14 px-8 text-lg"
                    data-testid="open-camera-btn"
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Open Camera
                  </Button>
                  <p className="text-sm text-gray-600">Click to open camera and capture your photo</p>
                </div>
              )}

              {showCamera && (
                <div className="space-y-4">
                  <div className="relative mx-auto w-full max-w-2xl">
                    <FaceRecognition
                      onCaptured={(dataUrl) => {
                        try {
                          const base64 = (dataUrl || '').split(',')[1] || null;
                          setFormData(prev => ({ ...prev, face_photo: base64 }));
                          setShowCamera(false);
                          toast.success('Face photo captured successfully');
                        } catch (_) {
                          toast.error('Failed to capture face photo');
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button onClick={() => setShowCamera(false)} variant="outline" className="h-12 px-6">Close</Button>
                  </div>
                </div>
              )}

              {formData.face_photo && (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-48 h-48 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={`data:image/jpeg;base64,${formData.face_photo}`}
                      alt="Face photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-green-600 font-medium">✓ Face photo captured successfully!</p>
                  <Button
                    onClick={() => {
                      setShowCamera(true);
                      setFormData(prev => ({ ...prev, face_photo: null }));
                    }}
                    variant="outline"
                    className="h-12 px-6"
                    data-testid="retake-photo-btn"
                  >
                    Retake Photo
                  </Button>
                </div>
              )}

              
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Service Provider Registration
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Join our platform and grow your service business
          </p>

          {/* Progress bar */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    ${currentStep >= step
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-1 mx-2 ${currentStep > step ? 'bg-emerald-600' : 'bg-gray-200'
                      }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {renderStep()}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <Button
            onClick={prevStep}
            variant="outline"
            disabled={currentStep === 1}
            className="h-12 px-6"
            data-testid="prev-step-btn"
          >
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={nextStep}
              className="btn-primary h-12 px-6"
              data-testid="next-step-btn"
            >
              Next Step
            </Button>
          ) : (
            <Button
              onClick={submitRegistration}
              disabled={isLoading}
              className="btn-primary h-12 px-8"
              data-testid="submit-registration-btn"
            >
              {isLoading ? 'Registering...' : 'Complete Registration'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderRegistration;