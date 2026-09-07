import React, { useState, useRef, useEffect } from 'react';

export function CameraCapture({ onPhotoSelected, onCancel, title = 'Capture Document' }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Attempt live camera stream on mount
  useEffect(() => {
    startLiveCamera();
    return () => {
      stopLiveCamera();
    };
  }, []);

  const startLiveCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
      }
    } catch (err) {
      // If WebRTC fails or denied, fall back cleanly to native camera input
      setIsCameraActive(false);
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureShutter = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `bill_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelectedFile(file);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          stopLiveCamera();
        }
      }, 'image/jpeg', 0.92);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      stopLiveCamera();
    }
  };

  const handleUsePhoto = () => {
    if (selectedFile && previewUrl) {
      onPhotoSelected(selectedFile, previewUrl);
    }
  };

  const handleRetake = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    startLiveCamera();
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-100 space-y-4 font-sans max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <div>
          <span className="text-[10px] uppercase font-extrabold text-primary tracking-wider">Document Scanner</span>
          <h2 className="text-base font-black text-gray-900">{title}</h2>
        </div>

        {onCancel && (
          <button
            onClick={() => {
              stopLiveCamera();
              onCancel();
            }}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Native Mobile Inputs (Hidden Triggers) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <canvas ref={canvasRef} className="hidden" />

      {previewUrl ? (
        /* 1. Captured Photo Preview */
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 bg-black aspect-[3/4] flex items-center justify-center shadow-md">
            <img src={previewUrl} alt="Document Preview" className="w-full h-full object-contain" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRetake}
              className="py-3 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl active:scale-[0.97] transition hover:bg-gray-200"
            >
              🔄 Retake
            </button>

            <button
              onClick={handleUsePhoto}
              className="py-3 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary-dark active:scale-[0.97] transition"
            >
              ✓ Process Bill & OCR ➔
            </button>
          </div>
        </div>
      ) : isCameraActive ? (
        /* 2. WebRTC Live Camera Stream View */
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border-2 border-primary bg-black aspect-[3/4] flex items-center justify-center shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-[11px] text-white/90 font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                Align Bill inside box
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCaptureShutter}
              className="py-3 bg-primary text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 hover:bg-primary-dark active:scale-95 transition"
            >
              <span>📷</span>
              <span>Capture Photo</span>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="py-3 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition"
            >
              <span>🖼️</span>
              <span>Upload Gallery</span>
            </button>
          </div>
        </div>
      ) : (
        /* 3. Direct Native Actions View (Default Mobile View) */
        <div className="space-y-4 py-2">
          <div className="p-6 border-2 border-dashed border-purple-200 rounded-2xl bg-purple-50/40 text-center space-y-2">
            <span className="text-4xl block">📄</span>
            <p className="text-xs font-extrabold text-gray-800">Scan Factory Bill or Receipt</p>
            <p className="text-[11px] text-gray-500 font-medium">Take a photo using your camera or pick an existing image file</p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full py-3.5 bg-primary text-white text-xs font-black rounded-xl shadow-md hover:bg-primary-dark active:scale-[0.97] transition flex items-center justify-center gap-2"
            >
              <span className="text-base">📷</span>
              <span>Open Device Camera</span>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full py-3 bg-gray-100 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-200 active:scale-[0.97] transition flex items-center justify-center gap-2 border border-gray-200"
            >
              <span className="text-base">🖼️</span>
              <span>Choose Photo from Gallery</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraCapture;

