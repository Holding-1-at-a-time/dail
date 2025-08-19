import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Modal from './Modal';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  useEffect(() => {
    if (isOpen) {
      const scanner = new Html5QrcodeScanner(
        'reader', 
        { 
          fps: 10, 
          qrbox: { width: 250, height: 150 } 
        },
        false // verbose
      );

      const success = (decodedText: string) => {
        scanner.clear();
        onScanSuccess(decodedText);
      };

      const error = (err: any) => {
        // console.warn(err);
      };

      scanner.render(success, error);

      return () => {
        scanner.clear().catch(err => console.error("Failed to clear scanner", err));
      };
    }
  }, [isOpen, onScanSuccess]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan Product Barcode">
      <div id="reader" style={{ width: '100%' }}></div>
    </Modal>
  );
};

export default BarcodeScannerModal;