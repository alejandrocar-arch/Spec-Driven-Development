/**
 * CameraScanner component
 * Camera-based barcode scanning using html5-qrcode.
 * Requests camera permissions on mount, scans continuously with 500ms cooldown.
 * Keyboard shortcut: Ctrl+S to open, Esc to close.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const SCAN_COOLDOWN_MS = 500;
const SCANNER_ELEMENT_ID = 'pos-camera-scanner';

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashSuccess, setFlashSuccess] = useState(false);

  const stopScanner = useCallback(async () => {
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  }, [isScanning]);

  const handleClose = useCallback(async () => {
    await stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (!mounted) return;

            // 500ms cooldown to prevent duplicate scans
            if (lastScannedRef.current === decodedText) return;
            lastScannedRef.current = decodedText;

            // Visual success feedback
            setFlashSuccess(true);
            setTimeout(() => setFlashSuccess(false), 600);

            onScan(decodedText);

            // Reset cooldown
            if (cooldownRef.current) clearTimeout(cooldownRef.current);
            cooldownRef.current = setTimeout(() => {
              lastScannedRef.current = null;
            }, SCAN_COOLDOWN_MS);
          },
          () => {
            // Ignore per-frame decode errors (no barcode in frame)
          }
        );

        if (mounted) setIsScanning(true);
      } catch (err) {
        if (mounted) {
          const message =
            err instanceof Error ? err.message : 'Camera access denied or unavailable.';
          setError(message);
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camera barcode scanner"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
    >
      <div className="bg-white rounded-xl shadow-2xl p-4 w-full max-w-sm flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ fontSize: '16px' }}>
            Scan Barcode
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close camera scanner"
            className="text-gray-500 hover:text-gray-800 focus:outline-none text-xl"
          >
            ✕
          </button>
        </div>

        {/* Scanner viewport */}
        <div className="relative">
          <div
            id={SCANNER_ELEMENT_ID}
            className={`w-full rounded-lg overflow-hidden transition-all ${
              flashSuccess ? 'ring-4 ring-green-400' : ''
            }`}
            style={{ minHeight: '200px', background: '#000' }}
            aria-label="Camera viewfinder"
          />
          {flashSuccess && (
            <div
              className="absolute inset-0 bg-green-400 bg-opacity-30 rounded-lg pointer-events-none"
              aria-live="polite"
              aria-label="Barcode detected"
            />
          )}
        </div>

        {/* Status */}
        {!isScanning && !error && (
          <p className="text-sm text-gray-500 text-center" style={{ fontSize: '14px' }}>
            Starting camera…
          </p>
        )}
        {isScanning && !error && (
          <p className="text-sm text-gray-500 text-center" style={{ fontSize: '14px' }}>
            Point camera at a barcode to scan
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="text-sm text-red-600 text-center"
            style={{ fontSize: '14px' }}
          >
            ❌ {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleClose}
          className="mt-1 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ fontSize: '14px' }}
        >
          Close (Esc)
        </button>
      </div>
    </div>
  );
};
