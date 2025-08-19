import React, { useRef, useEffect, useState } from 'react';
import Modal from './Modal';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  };

  useEffect(() => {
    if (isOpen) {
      const canvas = canvasRef.current;
      if (canvas) {
        setTimeout(() => {
          if (canvas.offsetWidth > 0) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const ctx = getCanvasContext();
            if (ctx) {
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 2;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
            }
          }
        }, 100);
      }
    } else {
        clearCanvas();
    }
  }, [isOpen]);
  
  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) { // Touch event
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    // Mouse event
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getCanvasContext();
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCanvasContext();
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const ctx = getCanvasContext();
    if (ctx) {
        ctx.closePath();
    }
    setIsDrawing(false);
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        const context = canvas.getContext('2d');
        if (!context) return;
        const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        const isEmpty = !pixelBuffer.some(color => color !== 0);
        
        if (isEmpty) {
            alert('Please provide a signature before saving.');
            return;
        }
        
        onSave(canvas.toDataURL('image/png'));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Signature">
      <div className="space-y-4">
        <p className="text-gray-400 text-sm">Please have the customer sign below to approve the estimate.</p>
        <canvas
          ref={canvasRef}
          className="bg-gray-700 rounded-md w-full h-48 touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="flex justify-between items-center pt-4">
            <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md transition-colors"
            >
                Cancel
            </button>
            <div className="flex space-x-3">
                <button onClick={clearCanvas} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">Clear</button>
                <button onClick={handleSave} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save Signature</button>
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default SignatureModal;
