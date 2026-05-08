import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import gaiLogo from '../assets/gai-logo.png';

interface RateImageModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function RateImageModal({ open, onClose, title, children }: RateImageModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    if (!cardRef.current) return;
    setCopying(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image:', err);
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-bb-navy">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={copying}
              className="px-3 py-1.5 text-sm font-medium bg-bb-navy text-white rounded-lg hover:bg-bb-navy-light transition-colors disabled:opacity-50"
            >
              {copied ? 'Copied!' : copying ? 'Copying...' : 'Copy as Image'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none px-2"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Scrollable card content */}
        <div className="overflow-auto p-5">
          <div
            ref={cardRef}
            className="bg-white border border-gray-200 rounded-lg p-6"
            style={{ minWidth: '600px' }}
          >
            {/* GAI Logo header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
              <img src={gaiLogo} alt="Great American Insurance" className="h-10 object-contain" />
              <div className="text-xs text-gray-500 font-medium">Contract Rate Information</div>
            </div>

            {/* Rate content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
