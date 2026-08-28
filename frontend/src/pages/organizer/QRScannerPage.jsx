import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import jsQR from 'jsqr';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { eventService } from '../../api/services/eventService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import {
  Camera,
  CameraOff,
  Upload,
  Keyboard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Flashlight,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Building,
  Hash,
  Ticket,
  Sparkles,
  ArrowRight,
  Zap,
  Check,
  RotateCw,
  QrCode,
  ScanLine
} from 'lucide-react';

export const QRScannerPage = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const initialEventId = searchParams.get('eventId') || '';

  // Mode: 'camera' | 'upload' | 'manual'
  const [activeTab, setActiveTab] = useState('camera');

  // Event filter
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);

  // Camera & Stream State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Manual & Upload State
  const [manualCode, setManualCode] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Verification & Check-in State
  const [verifying, setVerifying] = useState(false);
  const [verifiedPass, setVerifiedPass] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInRemarks, setCheckInRemarks] = useState('');

  // Audio confirmation synthesizer (plays a pleasant success chime on scan)
  const playBeep = useCallback((type = 'success') => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'error') {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (_) {}
  }, []);

  // Fetch organizer's assigned events for dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await eventService.getOrganizerEvents();
        if (res?.success) {
          setEvents(res.data || []);
        }
      } catch (err) {
        console.error('Error fetching organizer events:', err);
      }
    };
    fetchEvents();
  }, []);

  // Enumerate video devices
  useEffect(() => {
    const getDevices = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          setCameras(videoDevices);
          if (videoDevices.length > 0 && !selectedCameraId) {
            const backCam = videoDevices.find((d) => /back|rear|environment/i.test(d.label));
            setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
          }
        } catch (e) {
          console.warn('Could not enumerate cameras:', e);
        }
      }
    };
    getDevices();
  }, [selectedCameraId]);

  // Stop camera stream helper
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
    setTorchOn(false);
  }, []);

  // Start camera stream helper
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setCameraLoading(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser.');
      setCameraLoading(false);
      return;
    }

    try {
      const constraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video auto-play warning:', playErr);
        }
        setCameraActive(true);

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        if (track && track.getCapabilities && track.getCapabilities().torch) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in your browser address bar or settings.'
          : err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
          ? 'No camera found on this device.'
          : `Failed to open camera: ${err.message}`
      );
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  }, [selectedCameraId, stopCamera]);

  // Handle scanned raw QR payload
  const handleScannedData = useCallback(
    async (rawData) => {
      if (!rawData || verifying) return;

      // Stop camera loop temporarily while inspecting
      stopCamera();
      setVerifying(true);
      setVerifyError(null);
      setVerifiedPass(null);
      setCheckInSuccess(false);

      try {
        const res = await eventService.verifyAnyPass({ qr_data: rawData });
        if (res?.success && res.data) {
          setVerifiedPass(res.data);
          setCheckInRemarks(res.data.organizer_remarks || '');
          playBeep('success');
          showToast(`Pass verified for ${res.data.student?.name}!`, 'success');
        } else {
          setVerifyError(res?.message || 'Pass verification failed.');
          playBeep('error');
        }
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Failed to verify pass. Ensure you are authorized for this event.';
        setVerifyError(msg);
        playBeep('error');
      } finally {
        setVerifying(false);
      }
    },
    [verifying, stopCamera, playBeep, showToast]
  );

  // Multi-engine QR Decoder from Canvas/Image
  const decodeImageSource = useCallback(async (sourceCanvas, sourceImg = null) => {
    // Engine 1: Native Hardware BarcodeDetector API (Instant & native)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(sourceImg || sourceCanvas);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          const raw = barcodes[0].rawValue.trim();
          if (raw) return raw;
        }
      } catch (_) {}
    }

    // Engine 2: jsQR with both normal and inverted attempts
    const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (ctx && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
      try {
        const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
        if (code && code.data && code.data.trim() !== '') {
          return code.data.trim();
        }
      } catch (_) {}

      // Multi-scale rescale for high-res smartphone photos (> 1200px)
      const maxDim = Math.max(sourceCanvas.width, sourceCanvas.height);
      if (maxDim > 1200) {
        for (const targetDim of [1000, 600]) {
          try {
            const scale = targetDim / maxDim;
            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = Math.round(sourceCanvas.width * scale);
            scaledCanvas.height = Math.round(sourceCanvas.height * scale);
            const scaledCtx = scaledCanvas.getContext('2d');
            scaledCtx.drawImage(sourceCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
            const scaledImgData = scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
            const scaledCode = jsQR(scaledImgData.data, scaledImgData.width, scaledImgData.height, {
              inversionAttempts: 'attemptBoth'
            });
            if (scaledCode && scaledCode.data && scaledCode.data.trim() !== '') {
              return scaledCode.data.trim();
            }
          } catch (_) {}
        }
      }
    }

    // Engine 3: ZXing Library Fallback
    try {
      const { BrowserQRCodeReader } = await import('@zxing/library');
      const reader = new BrowserQRCodeReader();
      if (sourceImg) {
        const res = await reader.decodeFromImageElement(sourceImg);
        if (res && res.getText()) return res.getText().trim();
      } else if (sourceCanvas) {
        const dataUrl = sourceCanvas.toDataURL('image/png');
        const res = await reader.decodeFromImageUrl(dataUrl);
        if (res && res.getText()) return res.getText().trim();
      }
    } catch (_) {}

    return null;
  }, []);

  // Scan frame from video feed using multi-engine decoder
  const scanVideoFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive || verifying || verifiedPass) return;

    const video = videoRef.current;
    if (video.readyState < video.HAVE_CURRENT_DATA) return;

    // Fast-path 1: Native BarcodeDetector directly on <video> (runs in GPU/native C++)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          const raw = barcodes[0].rawValue.trim();
          if (raw) {
            handleScannedData(raw);
            return;
          }
        }
      } catch (_) {}
    }

    // Fast-path 2: jsQR on canvas frame
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.drawImage(video, 0, 0, width, height);

    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });

      if (code && code.data && code.data.trim() !== '') {
        handleScannedData(code.data.trim());
        return;
      }
    } catch (e) {
      // jsQR frame processing exception
    }
  }, [cameraActive, verifying, verifiedPass, handleScannedData]);

  // Setup video scanning interval
  useEffect(() => {
    if (cameraActive && !verifiedPass && !verifying) {
      scanIntervalRef.current = setInterval(() => {
        scanVideoFrame();
      }, 200);
    }
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [cameraActive, verifiedPass, verifying, scanVideoFrame]);

  // Auto-start camera when switching to 'camera' tab
  useEffect(() => {
    if (activeTab === 'camera' && !verifiedPass && !verifying) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, verifiedPass, verifying, startCamera, stopCamera]);

  // Toggle Flashlight/Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }]
        });
        setTorchOn(!torchOn);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  // Image Upload QR Decoder using multi-engine pipeline
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setVerifyError(null);

    try {
      let imageSrc = '';
      if (file.type.includes('svg') || file.name.endsWith('.svg')) {
        const svgText = await file.text();
        const base64 = btoa(unescape(encodeURIComponent(svgText)));
        imageSrc = `data:image/svg+xml;base64,${base64}`;
      } else {
        imageSrc = URL.createObjectURL(file);
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image file.'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 500;
      canvas.height = img.naturalHeight || img.height || 500;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize image processing context.');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const decodedData = await decodeImageSource(canvas, img);

      if (decodedData && decodedData.trim() !== '') {
        handleScannedData(decodedData.trim());
        return;
      }

      throw new Error(
        'No QR code detected in this image. Please ensure the QR code is clearly visible, well-lit, and unblurred.'
      );
    } catch (err) {
      setVerifyError(err.message || 'Could not decode QR code from image.');
      playBeep('error');
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  // Manual Pass Code Submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScannedData(manualCode.trim());
  };

  // Check-In Action
  const handleCheckIn = async () => {
    if (!verifiedPass) return;

    setCheckingIn(true);
    try {
      const res = await eventService.checkInAnyPass({
        pass_type: verifiedPass.pass_type,
        registration_id: verifiedPass.registration_id,
        attendance_status: 'present',
        remarks: checkInRemarks.trim() || undefined
      });

      if (res?.success) {
        setCheckInSuccess(true);
        setVerifiedPass((prev) => ({
          ...prev,
          attendance_status: 'present',
          checked_in_at: res.data?.checked_in_at || new Date().toISOString(),
          is_already_checked_in: true
        }));
        playBeep('success');
        showToast(
          res.message || `${verifiedPass.student?.name} marked as PRESENT!`,
          'success'
        );
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Check-in failed. Please verify organizer permissions.';
      showToast(msg, 'error');
      playBeep('error');
    } finally {
      setCheckingIn(false);
    }
  };

  // Reset and Scan Next
  const handleScanNext = () => {
    setVerifiedPass(null);
    setVerifyError(null);
    setCheckInSuccess(false);
    setManualCode('');
    setCheckInRemarks('');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  const isVolunteer = verifiedPass?.pass_type === 'volunteer';
  const isAlreadyPresent =
    verifiedPass?.attendance_status === 'present' ||
    verifiedPass?.attendance_status === 'completed' ||
    checkInSuccess;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Offscreen Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-extrabold uppercase tracking-wider">
              {isAdmin ? 'Admin Terminal' : 'Organizer Gate Terminal'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <QrCode className="w-7 h-7 text-indigo-400" />
            <span>QR Scanner & Attendance Gate</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time Attendee entry verification and Volunteer duty check-in terminal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="" className="text-slate-900">All Assigned Events ({events.length})</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id} className="text-slate-900">
                  {evt.title} ({new Date(evt.event_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner Viewfinder & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tab Selection */}
          <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => {
                setActiveTab('camera');
                handleScanNext();
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'camera'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Live Camera</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload QR Image</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('manual');
                stopCamera();
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'manual'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Manual Pass Code</span>
            </button>
          </div>

          {/* TAB 1: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-4 sm:p-6 space-y-4">
              {/* Camera Frame Container */}
              <div className="relative aspect-video sm:aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                {/* Always mount video element so .play() works reliably */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Target Graphic Overlay */}
                {cameraActive && !verifiedPass && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl shadow-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl shadow-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl shadow-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-xl shadow-lg" />

                      {/* Animated Laser Sweep Line */}
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-[bounce_2s_infinite]" />
                    </div>
                    <p className="text-white/90 text-[11px] font-bold mt-4 bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-xs border border-white/10 shadow">
                      Point camera at Attendee or Volunteer QR pass
                    </p>
                  </div>
                )}

                {/* Camera Inactive / Loading / Error Overlay */}
                {(!cameraActive || cameraLoading) && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3 z-10">
                    {cameraLoading ? (
                      <LoadingSpinner text="Starting camera video stream..." />
                    ) : (
                      <>
                        <CameraOff className="w-12 h-12 mx-auto text-slate-600" />
                        <div>
                          <p className="text-sm font-bold text-white">Camera Offline</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                            {cameraError || 'Click below to activate camera permissions and begin scanning.'}
                          </p>
                        </div>
                        <button
                          onClick={startCamera}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                        >
                          Start Camera
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Camera Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  {cameras.length > 1 && (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
                    >
                      {cameras.map((c, idx) => (
                        <option key={c.deviceId} value={c.deviceId}>
                          {c.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}

                  {torchSupported && cameraActive && (
                    <button
                      onClick={toggleTorch}
                      className={`p-2 rounded-xl border transition-colors flex items-center gap-1 font-bold ${
                        torchOn
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Toggle Flashlight"
                    >
                      <Flashlight className="w-4 h-4" />
                      <span>{torchOn ? 'Torch On' : 'Torch'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {cameraActive ? (
                    <button
                      onClick={stopCamera}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                    >
                      Stop Camera
                    </button>
                  ) : (
                    <button
                      onClick={startCamera}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-open Camera</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Upload QR Image */}
          {activeTab === 'upload' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 text-center space-y-4">
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-3xl p-8 sm:p-12 transition-colors flex flex-col items-center justify-center space-y-3 bg-slate-50/50">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Upload QR Code Photo or Pass</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select a photo, screenshot, or downloaded pass from your device
                  </p>
                </div>
                <label className="cursor-pointer px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors inline-block mt-2">
                  {uploadLoading ? 'Decoding Image...' : 'Choose Image File'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadLoading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: Manual Code Input */}
          {activeTab === 'manual' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manual Pass Code Verification</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type or paste the unique pass code from the student's pass ticket.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Pass Code or Registration Identifier
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="e.g. REG-ATT-2026-00001 or REG-VOL-2026-00001"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifying || !manualCode.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{verifying ? 'Verifying Code...' : 'Lookup & Verify Pass'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Verified Pass Details & Check-In Action (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {verifying ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-sm text-center">
              <LoadingSpinner text="Verifying pass authenticity with college server..." />
            </div>
          ) : verifyError ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-sm space-y-4 text-center">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Verification Blocked</h3>
                <p className="text-xs text-rose-600 font-medium mt-1">{verifyError}</p>
              </div>
              <button
                onClick={handleScanNext}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Scan Another Pass
              </button>
            </div>
          ) : verifiedPass ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden animate-in fade-in duration-300">
              {/* Card Accent Top Bar */}
              <div
                className={`h-3 w-full ${
                  isVolunteer
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700'
                    : 'bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700'
                }`}
              />

              <div className="p-6 space-y-5">
                {/* Duplicate Check-In Warning Banner */}
                {isAlreadyPresent && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-extrabold text-emerald-800">
                        {checkInSuccess ? 'CHECK-IN CONFIRMED' : 'ALREADY CHECKED IN'}
                      </p>
                      <p className="text-emerald-700 mt-0.5">
                        {checkInSuccess
                          ? 'Participant successfully marked as Present in MySQL database.'
                          : `Participant was already marked Present at ${
                              verifiedPass.checked_in_at
                                ? new Date(verifiedPass.checked_in_at).toLocaleTimeString()
                                : 'gate terminal'
                            }.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Pass Type & Status Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full ${
                        isVolunteer
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {isVolunteer ? 'Official Volunteer Pass' : 'Attendee Entry Pass'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                      {verifiedPass.event?.title}
                    </h3>
                  </div>

                  <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                    {verifiedPass.pass_code}
                  </span>
                </div>

                {/* Student Info Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                      {verifiedPass.student?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-extrabold text-slate-900 truncate">
                        {verifiedPass.student?.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {verifiedPass.student?.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Department
                      </span>
                      <p className="font-bold text-slate-800 truncate">
                        {verifiedPass.student?.department || 'General'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Roll Number
                      </span>
                      <p className="font-bold text-slate-800 truncate">
                        {verifiedPass.student?.roll_number || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event Schedule Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Event Date
                    </span>
                    <p className="font-bold text-slate-800 flex items-center gap-1 truncate">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      {verifiedPass.event?.event_date
                        ? new Date(verifiedPass.event.event_date).toLocaleDateString()
                        : 'TBA'}
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Venue
                    </span>
                    <p className="font-bold text-slate-800 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="truncate">{verifiedPass.event?.venue}</span>
                    </p>
                  </div>
                </div>

                {/* Volunteer Role Remarks */}
                {isVolunteer && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Assigned Volunteer Duty / Coordinator Remarks
                    </label>
                    <input
                      type="text"
                      value={checkInRemarks}
                      onChange={(e) => setCheckInRemarks(e.target.value)}
                      placeholder="e.g. Assigned to Kit Distribution Desk"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className={`w-full py-3.5 px-4 font-black text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 ${
                      isAlreadyPresent
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : isVolunteer
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {checkingIn ? (
                      <span>Updating Attendance in Database...</span>
                    ) : isAlreadyPresent ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Attendance Marked Present (Re-Confirm)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Check In {isVolunteer ? 'Volunteer' : 'Attendee'} (Mark Present)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleScanNext}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Scan Next Student Pass</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <ScanLine className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700">Awaiting Pass Scan</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Scan an Attendee or Volunteer pass using the live camera, upload an image, or type the code to verify registration and record attendance.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
