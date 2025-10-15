import React, { useState, useRef, useEffect } from 'react';
import '@tensorflow/tfjs';
import { Camera, CheckCircle, XCircle, Loader2, User, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { toast } from 'sonner';

const FaceRecognition = ({ onCaptured }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const modelRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceInZone, setFaceInZone] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);
  const [status, setStatus] = useState('idle');
  const [modelLoading, setModelLoading] = useState(true);

  useEffect(() => {
    loadModel();
    startCamera();
    return () => {
      stopCamera();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const loadModel = async () => {
    try {
      setModelLoading(true);
      const blazeface = await import('@tensorflow-models/blazeface');
      const model = await blazeface.load();
      modelRef.current = model;
      setModelLoading(false);
      toast.success('Face detection ready');
    } catch (err) {
      console.error('Model loading error:', err);
      setModelLoading(false);
      toast.error('Failed to load face detection');
    }
  };

  useEffect(() => {
    const run = () => {
      if (cameraActive && status === 'detecting' && modelRef.current && !modelLoading) {
        detectionIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const predictions = await modelRef.current.estimateFaces(videoRef.current, false);
              const detected = predictions && predictions.length > 0;
              setFaceDetected(detected);

              if (detected && predictions[0]) {
                const face = predictions[0];
                const video = videoRef.current;

                const zoneWidth = 280;
                const zoneHeight = 350;
                const zoneCenterX = video.videoWidth / 2;
                const zoneCenterY = video.videoHeight / 2;
                const zoneLeft = zoneCenterX - zoneWidth / 2;
                const zoneRight = zoneCenterX + zoneWidth / 2;
                const zoneTop = zoneCenterY - zoneHeight / 2;
                const zoneBottom = zoneCenterY + zoneHeight / 2;

                const faceLeft = face.topLeft[0];
                const faceTop = face.topLeft[1];
                const faceRight = face.bottomRight[0];
                const faceBottom = face.bottomRight[1];

                const faceCenterX = (faceLeft + faceRight) / 2;
                const faceCenterY = (faceTop + faceBottom) / 2;

                const inZone = faceCenterX > zoneLeft && faceCenterX < zoneRight && faceCenterY > zoneTop && faceCenterY < zoneBottom;
                setFaceInZone(inZone);

                if (overlayCanvasRef.current) {
                  const canvas = overlayCanvasRef.current;
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  const ctx = canvas.getContext('2d');
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.strokeStyle = inZone ? '#22c55e' : '#ef4444';
                  ctx.lineWidth = 3;
                  ctx.strokeRect(faceLeft, faceTop, faceRight - faceLeft, faceBottom - faceTop);
                }

                if (inZone && !capturing) {
                  setTimeout(() => {
                    startAutoCapture();
                  }, 1000);
                }
              } else {
                setFaceInZone(false);
                if (overlayCanvasRef.current) {
                  const ctx = overlayCanvasRef.current.getContext('2d');
                  ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
                }
              }
            } catch (err) {
              console.error('Face detection error:', err);
            }
          }
        }, 500);
      }
    };
    run();
    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, [cameraActive, status, capturing, modelLoading]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setStatus('detecting');
        toast.message('Camera activated', { description: 'Position your face in the frame' });
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setStatus('error');
      toast.error('Please allow camera access to continue');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const startAutoCapture = () => {
    setCapturing(true);
    setStatus('capturing');
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      setCaptureProgress(progress);
      if (progress >= 100) {
        clearInterval(progressInterval);
        capturePhoto();
      }
    }, 100);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
      if (typeof onCaptured === 'function') onCaptured(imageData);
      setStatus('success');
      setCapturing(false);
      setCaptureProgress(0);
      toast.success('Photo captured successfully!');
      stopCamera();
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setStatus('idle');
    setFaceDetected(false);
    setFaceInZone(false);
    setCapturing(false);
    setCaptureProgress(0);
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    startCamera();
  };

  return (
    <div className="relative">
      <Card className="overflow-hidden shadow-2xl">
        {!capturedImage ? (
          <div className="relative">
            <div className="relative bg-slate-900 aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              {cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-64 h-80 border-4 rounded-3xl transition-all duration-500 ${faceInZone ? 'border-green-500 shadow-lg shadow-green-500/50 scale-105' : faceDetected ? 'border-yellow-500 shadow-lg shadow-yellow-500/30' : 'border-red-500/60 shadow-lg shadow-red-500/30'}`} style={{ borderStyle: 'dashed' }} />
                </div>
              )}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                <div className={`px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 transition-all duration-300 ${faceInZone ? 'bg-green-500/90 text-white' : faceDetected ? 'bg-yellow-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                  {faceInZone ? (<><CheckCircle className="w-5 h-5" /><span className="font-medium">Face in Zone ✓</span></>) : faceDetected ? (<><Eye className="w-5 h-5" /><span className="font-medium">Align Face in Zone</span></>) : (<><XCircle className="w-5 h-5" /><span className="font-medium">Face Not Found</span></>)}
                </div>
                {capturing && (
                  <div className="px-4 py-2 rounded-full bg-blue-500/90 backdrop-blur-md text-white flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium">Capturing...</span>
                  </div>
                )}
              </div>
              {capturing && (
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <Progress value={captureProgress} className="h-2" />
                </div>
              )}
            </div>
            <div className="bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Instructions</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div>Keep your face within the square zone</div>
                <div>Look directly at the camera</div>
                <div>Ensure good lighting on your face</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="relative bg-slate-900 aspect-video">
              <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Recognition Complete!</h3>
                  <p className="text-white/90">Your face has been successfully captured</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 flex gap-4">
              <Button onClick={resetCapture} variant="outline" className="flex-1">Try Again</Button>
              <Button onClick={() => toast.success('Processing complete')} className="flex-1 bg-blue-600 hover:bg-blue-700">Continue</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FaceRecognition;
