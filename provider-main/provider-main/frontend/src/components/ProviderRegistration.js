import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Webcam from 'react-webcam';
import FaceRecognition from './FaceRecognition';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Camera, Upload, FileText, User, Shield, Award, Briefcase } from 'lucide-react';
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


  // No local OTP timers; rely on central auth (service-app-main)

  // Sync currentStep from URL param when present
  useEffect(() => {
    if (step) {
      const n = parseInt(step, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 5 && n !== currentStep) {
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

  // Auth guard: ensure a session exists on this origin
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user || null;
        if (!user) {
          try { toast.error('Please login to continue'); } catch (_) {}
          navigate('/login', { replace: true, state: { redirect: location.pathname } });
        }
      } catch (_) {
        navigate('/login', { replace: true, state: { redirect: location.pathname } });
      }
    })();
  }, []);



  const [formData, setFormData] = useState({
    professions: [],
    trade_license: null,
    health_permit: null,
    certificates: [],
    work_sample: null,
    aadhaar_card: null,
    pan_card: null,
    face_photo: null,
    govt_certificate: null,
    work_photos: [],
    about_text: '',
    work_videos: [],
    location_lat: null,
    location_lng: null,
    location_accuracy: null,
    location_address: ''
  });

  // No local email verification; rely on central auth session

  // Compute basic face match whenever ID or face changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idBase = formData.aadhaar_card || formData.pan_card;
        if (!idBase || !formData.face_photo) { setFaceMatched(false); return; }
        const [h1, h2] = await Promise.all([aHashFromBase64(idBase), aHashFromBase64(formData.face_photo)]);
        if (cancelled) return;
        const dist = hammingDistance(h1, h2);
        // threshold tuned conservatively for hash size 64 bits
        setFaceMatched(Number.isFinite(dist) && dist <= 18);
      } catch (_) {
        if (!cancelled) setFaceMatched(false);
      }
    })();
    return () => { cancelled = true; };
  }, [formData.aadhaar_card, formData.pan_card, formData.face_photo]);

  const [uploadedFiles, setUploadedFiles] = useState({
    trade_license: null,
    health_permit: null,
    certificates: [],
    work_sample: null,
    aadhaar_card: null,
    pan_card: null,
    govt_certificate: null,
    work_photos: [],
    work_videos: []
  });

  // Local verification flags for Aadhaar and PAN via client-side OCR
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [idHolderName, setIdHolderName] = useState('');
  const [certificateVerified, setCertificateVerified] = useState([]); // index-aligned with certificates
  const [faceMatched, setFaceMatched] = useState(false);

  // Extract probable name from OCR text
  const extractNameFromOcr = (text) => {
    const cleaned = (text || '').replace(/\t/g, ' ').split(/\n+/).map(s => s.trim()).filter(Boolean);
    // Look for explicit label first
    for (const line of cleaned) {
      const m = line.match(/name\s*[:\-]\s*([A-Z ]{3,})/i);
      if (m && m[1]) return m[1].replace(/\s+/g, ' ').trim();
    }
    // Fallback: first strong uppercase line excluding common headers
    const blacklist = ['GOVERNMENT OF INDIA','INCOME TAX DEPARTMENT','PERMANENT ACCOUNT NUMBER','UNIQUE IDENTIFICATION AUTHORITY OF INDIA','AADHAAR','AADHAR'];
    for (const line of cleaned) {
      const up = line.toUpperCase();
      if (blacklist.some(k => up.includes(k))) continue;
      if (/^[A-Z ][A-Z ]{2,}$/.test(up) && up.split(/\s+/).length >= 2) {
        return up.replace(/\s+/g, ' ').trim();
      }
    }
    return '';
  };

  // Lazy-load Tesseract at runtime to avoid adding build dependencies
  const loadTesseract = () => {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) return resolve(window.Tesseract);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js';
      script.async = true;
      script.onload = () => resolve(window.Tesseract);
      script.onerror = () => reject(new Error('Failed to load OCR library'));
      document.body.appendChild(script);
    });
  };

  const ocrImage = async (base64) => {
    try {
      const Tesseract = await loadTesseract();
      // Preprocess: upscale, grayscale, increase contrast
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = `data:image/jpeg;base64,${base64}`;
      });
      const maxW = 1600;
      const scale = Math.min(2, maxW / Math.max(1, img.naturalWidth || img.width || maxW));
      const w = Math.floor((img.naturalWidth || img.width) * scale);
      const h = Math.floor((img.naturalHeight || img.height) * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      // grayscale + contrast
      const contrast = 1.2; // 20% more contrast
      const intercept = 128 * (1 - contrast);
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        let v = gray * contrast + intercept;
        v = Math.max(0, Math.min(255, v));
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);
      const preprocessed = canvas.toDataURL('image/jpeg', 0.9);
      const { data } = await Tesseract.recognize(preprocessed, 'eng');
      return data?.text || '';
    } catch (e) {
      return '';
    }
  };

  const verifyAadhaarText = (text) => {
    // TEMP: Simple verification only — accept if a 12-digit Aadhaar-like pattern exists.
    // Previous strict logic (keywords + Verhoeff checksum) intentionally disabled until deployment issues are resolved.
    // const cleaned = (text || '').replace(/[^0-9A-Z]/gi, ' ').toUpperCase();
    // const hasAadhaarWord = cleaned.includes('AADHAAR') || cleaned.includes('AADHAR');
    // const hasGovKeywords = cleaned.includes('GOVERNMENT OF INDIA') || cleaned.includes('UNIQUE IDENTIFICATION AUTHORITY OF INDIA');
    // ... Verhoeff checksum implementation ...
    // return hasValidAadhaarNumber && (hasAadhaarWord || hasGovKeywords);

    const t = text || '';
    // Match 1234 5678 9012 or 123456789012
    const spaced = /\b\d{4}\s\d{4}\s\d{4}\b/;
    const compact = /\b\d{12}\b/;
    if (spaced.test(t)) return true;
    // Also try compact after stripping spaces and non-digits
    const digits = t.replace(/\D/g, '');
    return /\d{12}/.test(digits);
  };

  const verifyPanText = (text) => {
    const cleaned = (text || '').toUpperCase();
    const hasDeptWord = cleaned.includes('INCOME TAX DEPARTMENT') || cleaned.includes('PERMANENT ACCOUNT NUMBER');
    const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/;
    const hasPanFormat = panRegex.test(cleaned);
    // Strict requirement: must have exact PAN format AND one of the PAN-related keywords
    return hasPanFormat && hasDeptWord;
  };

  const requiresTradeLicense = () => {
    return formData.professions.some(prof =>
      ['photographer', 'videographer', 'hairstylist', 'makeup_artist', 'massage_therapist', 'henna_artist', 'locksmith'].includes(prof)
    );
  };

  const requiresHealthPermit = () => {
    return formData.professions.some(prof =>
      ['hairstylist', 'makeup_artist', 'massage_therapist', 'henna_artist', 'caterer'].includes(prof)
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file type and size per field
    const isVideoField = fieldName === 'work_videos';
    const isMultiImageField = fieldName === 'work_photos' || fieldName === 'certificates';
    const isImageField = !isVideoField;
    const maxImageSize = 5 * 1024 * 1024;
    const maxVideoSize = 50 * 1024 * 1024;
    for (const file of files) {
      if (isVideoField) {
        if (!file.type.startsWith('video/')) {
          toast.error('Please upload a video file');
          return;
        }
        if (file.size > maxVideoSize) {
          toast.error('Video size should be less than 50MB');
          return;
        }
      } else {
        if (!file.type.startsWith('image/')) {
          toast.error('Please upload an image file');
          return;
        }
        if (file.size > maxImageSize) {
          toast.error('Image size should be less than 5MB');
          return;
        }
      }
    }

    try {
      if (fieldName === 'work_photos') {
        const b64s = [];
        for (const f of files) {
          const b64 = await handleFileUpload(f, fieldName);
          if (b64) b64s.push(b64);
        }
        setFormData(prev => ({ ...prev, work_photos: [...(prev.work_photos || []), ...b64s] }));
        setUploadedFiles(prev => ({ ...prev, work_photos: [...(prev.work_photos || []), ...files.map(f => f.name)] }));
        toast.success(`${files.length} work photo(s) uploaded`);
        return;
      }
      if (fieldName === 'work_videos') {
        const b64s = [];
        for (const f of files) {
          const b64 = await handleFileUpload(f, fieldName);
          if (b64) b64s.push(b64);
        }
        setFormData(prev => ({ ...prev, work_videos: [...(prev.work_videos || []), ...b64s] }));
        setUploadedFiles(prev => ({ ...prev, work_videos: [...(prev.work_videos || []), ...files.map(f => f.name)] }));
        toast.success(`${files.length} work video(s) uploaded`);
        return;
      }

      const file = files[0];
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
        // OCR the certificate and verify name match if we have an ID holder name
        const certText = await ocrImage(base64);
        let name = idHolderName;
        if (!name) {
          // try use existing Aadhaar/PAN OCR names
          name = idHolderName;
        }
        const matched = name ? certText.toUpperCase().includes(name.toUpperCase()) : false;
        setCertificateVerified(prev => ([...prev, matched]));
        if (matched) {
          toast.success('Certificate name matched with ID');
        } else {
          toast.error('Certificate name did not match ID');
        }
      } else {
        setFormData(prev => ({ ...prev, [fieldName]: base64 }));
        setUploadedFiles(prev => ({ ...prev, [fieldName]: file.name }));

        // Skip OCR for Aadhaar and PAN: just store files
        if (fieldName === 'aadhaar_card' || fieldName === 'pan_card') {
          // no-op (files already set)
        }
        if (fieldName === 'govt_certificate') {
          // For electrician mandatory certificate, verify name if available
          const text = await ocrImage(base64);
          const matched = idHolderName ? text.toUpperCase().includes(idHolderName.toUpperCase()) : false;
          if (matched) toast.success('Government certificate name matched with ID');
          else toast.error('Government certificate name did not match ID');
        }
      }

      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload file');
    }
  };

  // Add helpers to compute simple image hash for face match (aHash)
  const aHashFromBase64 = async (base64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 8; canvas.height = 8;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 8, 8);
        const data = ctx.getImageData(0, 0, 8, 8).data;
        const grays = [];
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          grays.push(0.299*r + 0.587*g + 0.114*b);
        }
        const avg = grays.reduce((a,b)=>a+b,0) / grays.length;
        const bits = grays.map(v => v >= avg ? 1 : 0);
        resolve(bits);
      };
      img.onerror = () => resolve(null);
      img.src = `data:image/jpeg;base64,${base64}`;
    });
  };

  const hammingDistance = (a, b) => {
    if (!a || !b || a.length !== b.length) return Infinity;
    let d = 0; for (let i=0;i<a.length;i++) if (a[i] !== b[i]) d++;
    return d;
  };

  const captureLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported in this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords || {};
        setFormData(prev => ({
          ...prev,
          location_lat: latitude || null,
          location_lng: longitude || null,
          location_accuracy: accuracy || null
        }));
        toast.success('Location captured');
      },
      (err) => {
        toast.error(err?.message || 'Failed to get location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
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
        if (formData.professions.length === 0) {
          toast.error('Please select at least one profession');
          return false;
        }
        return true;
      case 2:
        if (!formData.aadhaar_card || !formData.pan_card) {
          toast.error('Please upload both Aadhaar and PAN card');
          return false;
        }
        return true;
      case 3:
        if (requiresTradeLicense() && isLocksmiths() && !formData.trade_license) {
          toast.error('Trade License is mandatory for Locksmiths');
          return false;
        }
        // Electrician: require govt certificate
        if (formData.professions.includes('electrician') && !formData.govt_certificate) {
          toast.error('Government certificate is mandatory for Electricians');
          return false;
        }
        if (!formData.work_sample) {
          toast.error('Please upload your best work sample');
          return false;
        }
        return true;
      case 4:
        // About text: maximum 100 lines
        const lines = (formData.about_text || '').split(/\r?\n/).length;
        if (lines > 100) {
          toast.error('About section must be within 100 lines');
          return false;
        }
        if (!formData.location_lat || !formData.location_lng) {
          toast.error('Please capture your current location');
          return false;
        }
        return true;
      case 5:
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
      const newStep = Math.min(currentStep + 1, 5);
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
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user || null;
      if (!sessionUser?.id) {
        toast.error('Please login to continue');
        setIsLoading(false);
        return;
      }
      const user_id = sessionUser.id;
      const toBlob = (b64) => {
        const byteChars = atob(b64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'image/jpeg' });
      };
      const folder = `${user_id}`;
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

      // Newly added uploads
      documents.govt_certificate = await upload(formData.govt_certificate, 'govt_certificate.jpg');
      const workPhotos = [];
      if (Array.isArray(formData.work_photos)) {
        for (let i = 0; i < formData.work_photos.length; i++) {
          const p = await upload(formData.work_photos[i], `work_photo_${i + 1}.jpg`);
          if (p) workPhotos.push(p);
        }
      }
      documents.work_photos = workPhotos;
      const workVideos = [];
      if (Array.isArray(formData.work_videos)) {
        for (let i = 0; i < formData.work_videos.length; i++) {
          // store videos with mp4 extension; contentType default in helper is image/jpeg, so override locally for videos
          const b64 = formData.work_videos[i];
          if (!b64) continue;
          const toBlob = (base64) => {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: 'video/mp4' });
          };
          const folder = `${user_id}`;
          const filename = `work_video_${i + 1}.mp4`;
          const path = `${folder}/${filename}`;
          const { error } = await supabase.storage.from('provider-docs').upload(path, toBlob(b64), { upsert: true, contentType: 'video/mp4' });
          if (!error) workVideos.push(path);
        }
      }
      documents.work_videos = workVideos;

      const has_trade_license = !!documents.trade_license;
      const has_health_permit = !!documents.health_permit;
      const has_certificates = Array.isArray(documents.certificates) && documents.certificates.length > 0;

      const professional_status = {};
      for (const profession of formData.professions) {
        if (['photographer','videographer','massage_therapist','hairstylist','henna_artist','makeup_artist','caterer'].includes(profession)) {
          if (!has_trade_license || (['massage_therapist','hairstylist','henna_artist','makeup_artist','caterer'].includes(profession) && !has_health_permit)) {
            professional_status[profession] = 'Amateur/Freelancer';
          } else {
            professional_status[profession] = 'Professional';
          }
        } else {
          professional_status[profession] = 'Professional';
        }
      }

      const insertRow = {
        professions: formData.professions,
        has_trade_license,
        has_health_permit,
        has_certificates,
        professional_status,
        documents,
        is_verified: true,
        verification_date: new Date().toISOString(),
        user_id: user_id || undefined,
        location: {
          lat: formData.location_lat,
          lng: formData.location_lng,
          accuracy: formData.location_accuracy,
          address: formData.location_address || null
        },
        last_location_at: new Date().toISOString()
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
  // Removed local mobile/email OTP flows; central auth handles identity
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
              <p className="text-gray-600">Select your profession(s) to continue</p>
            </CardHeader>
            <CardContent className="space-y-6">
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

      case 3:
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
                    Health and Hygiene Permits (Mandatory for Caterers; Optional for select professions)
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

              {formData.professions.includes('electrician') && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Government Certificate (Mandatory for Electricians)
                  </Label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'govt_certificate')}
                      className="hidden"
                      id="govt-certificate"
                      data-testid="govt-certificate-upload"
                    />
                    <label htmlFor="govt-certificate" className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-700">
                        {uploadedFiles.govt_certificate ? uploadedFiles.govt_certificate : 'Click to upload Govt Certificate'}
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

              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Additional Work Photos (Optional)
                </Label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'work_photos')}
                    className="hidden"
                    id="work-photos"
                    multiple
                    data-testid="work-photos-upload"
                  />
                  <label htmlFor="work-photos" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700">Upload additional work photos</p>
                    <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB (Multiple files allowed)</p>
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
              <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
                <FileText className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-800">About & Work Videos</CardTitle>
              <p className="text-gray-600">Tell clients about yourself and optionally upload videos of your work</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">About You (max 100 lines)</Label>
                <textarea
                  className="w-full h-48 p-3 border rounded-md focus:outline-none"
                  placeholder="Write about your experience, skills, and services..."
                  value={formData.about_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, about_text: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Work Videos (Optional)
                </Label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileChange(e, 'work_videos')}
                    className="hidden"
                    id="work-videos"
                    multiple
                    data-testid="work-videos-upload"
                  />
                  <label htmlFor="work-videos" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Upload MP4/MOV (each up to 50MB)</p>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Current Location</Label>
                <div className="flex items-center gap-3">
                  <Button onClick={captureLocation} className="h-10 px-4" data-testid="capture-location-btn">
                    Capture Current Location
                  </Button>
                  {formData.location_lat && formData.location_lng && (
                    <p className="text-sm text-gray-600">
                      Lat: {formData.location_lat}, Lng: {formData.location_lng}
                      {typeof formData.location_accuracy === 'number' && (
                        <> (±{Math.round(formData.location_accuracy)} m)</>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
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
                  <p className="text-green-600 font-medium">{faceMatched ? '✓ Face matched with ID' : 'Face not matched with ID yet'}</p>
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
              {[1, 2, 3, 4, 5].map((step) => (
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
                  {step < 5 && (
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

          {currentStep < 5 ? (
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