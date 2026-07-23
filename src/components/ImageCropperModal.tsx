import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Crop, Check, X, Move } from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string;
  onCrop: (croppedBase64: string) => void;
  onCancel: () => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  imageSrc,
  onCrop,
  onCancel,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, baseScale: 1 });
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerSize = 280; // Viewport size in pixels (280x280 square)

  useEffect(() => {
    setImageLoaded(false);
    setZoom(1.0);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, [imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    
    // Cover strategy: scale the image so the shorter side matches containerSize
    const scaleX = containerSize / w;
    const scaleY = containerSize / h;
    const baseScale = Math.max(scaleX, scaleY);
    
    setDimensions({
      width: w,
      height: h,
      baseScale: baseScale,
    });
    setImageLoaded(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleRotate = (dir: 'left' | 'right') => {
    setRotation((prev) => {
      const offset = dir === 'right' ? 90 : -90;
      return (prev + offset) % 360;
    });
  };

  const handleSaveCrop = () => {
    if (!imageRef.current || !imageLoaded) return;
    
    const canvas = document.createElement('canvas');
    const targetSize = 350; // High-quality square output
    canvas.width = targetSize;
    canvas.height = targetSize;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background color (e.g., white or transparent)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, targetSize, targetSize);

    ctx.save();
    
    // Translate origin to canvas center
    ctx.translate(targetSize / 2, targetSize / 2);
    
    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Apply scale: combination of baseScale (to fit viewport) + zoom + scaling to output canvas size
    const exportScale = (targetSize / containerSize) * dimensions.baseScale * zoom;
    ctx.scale(exportScale, exportScale);
    
    // Apply pan: scaled appropriately to the output canvas coordinate system
    const pannedX = pan.x * (targetSize / containerSize);
    const pannedY = pan.y * (targetSize / containerSize);
    
    // Because the canvas is rotated, the translation matrix rotated as well.
    // If rotation is active, we should project the pan offsets into the rotated coordinates,
    // or keep it simple: draw centering the original image and translate by rotated coordinates.
    // Let's perform simple offset rotation math to ensure X/Y pan always match visual directions!
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    const rotX = pannedX * cos - pannedY * sin;
    const rotY = pannedX * sin + pannedY * cos;

    // Draw the image centered
    const drawX = -dimensions.width / 2 + (rotX / exportScale);
    const drawY = -dimensions.height / 2 + (rotY / exportScale);
    
    ctx.drawImage(
      imageRef.current,
      drawX,
      drawY,
      dimensions.width,
      dimensions.height
    );
    
    ctx.restore();
    
    try {
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
      onCrop(croppedBase64);
    } catch (err) {
      console.error("Failed to crop image on canvas: ", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-md bg-neutral-900 border-2 border-neutral-800 rounded-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-400 text-neutral-950 rounded-xs">
              <Crop size={16} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans">Crop Student Photo</h3>
              <p className="text-[9px] font-mono text-amber-400 uppercase font-bold tracking-widest mt-0.5">Square Aspect Enforced (1:1)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-neutral-500 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-neutral-900">
          <div 
            className="relative overflow-hidden bg-neutral-950 border-2 border-amber-400/80 rounded shadow-lg select-none group"
            style={{ width: containerSize, height: containerSize }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Guidelines grid overlay */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10 opacity-20 group-hover:opacity-35 transition-opacity">
              <div className="border-r border-b border-white border-dashed"></div>
              <div className="border-r border-b border-white border-dashed"></div>
              <div className="border-b border-white border-dashed"></div>
              <div className="border-r border-b border-white border-dashed"></div>
              <div className="border-r border-b border-white border-dashed"></div>
              <div className="border-b border-white border-dashed"></div>
              <div className="border-r border-white border-dashed"></div>
              <div className="border-r border-white border-dashed"></div>
              <div></div>
            </div>

            {/* Hint overlay */}
            <div className="absolute inset-x-0 bottom-2 text-center pointer-events-none z-10 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-black/80 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest text-neutral-300 flex items-center gap-1 border border-neutral-800">
                <Move size={10} className="text-amber-400" /> Drag to Position
              </span>
            </div>

            {/* The actual image being cropped */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Source to crop"
              onLoad={handleImageLoad}
              className="max-w-none max-h-none pointer-events-none origin-center"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${dimensions.baseScale * zoom})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            />
          </div>
          
          <p className="text-[10px] text-neutral-500 font-mono mt-3 uppercase tracking-wider text-center">
            Reposition the student's head to be centered inside the box
          </p>
        </div>

        {/* Controls Panel */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 space-y-4">
          {/* Zoom Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              <span>Scale / Zoom</span>
              <span className="text-amber-400 font-bold">{(zoom * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(1.0, prev - 0.1))}
                className="p-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:text-white text-neutral-400 rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(3.0, prev + 0.1))}
                className="p-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:text-white text-neutral-400 rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          </div>

          {/* Rotations & Utilities Row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              Orientation Rotation
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleRotate('left')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 font-mono font-bold uppercase tracking-wider rounded transition-colors"
              >
                <RotateCcw size={10} className="text-amber-400" />
                -90°
              </button>
              <button
                type="button"
                onClick={() => handleRotate('right')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 font-mono font-bold uppercase tracking-wider rounded transition-colors"
              >
                <RotateCw size={10} className="text-amber-400" />
                +90°
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border-2 border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white text-xs font-mono font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCrop}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-amber-400 bg-amber-400 hover:bg-amber-350 text-neutral-950 text-xs font-mono font-black uppercase tracking-widest shadow-[3px_3px_0px_rgba(255,255,255,0.1)] transition-all hover:translate-y-[-1px] cursor-pointer"
            >
              <Check size={14} className="stroke-[3px]" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
