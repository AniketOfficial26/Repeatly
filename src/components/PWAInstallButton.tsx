import { Download, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`min-h-[42px] px-3.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-transform active:scale-95 ${
          compact ? '' : 'w-full justify-center'
        }`}
        style={{
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-fg)',
        }}
      >
        <Download className="w-4 h-4" />
        <span>Install Repeatly App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[42px] px-3.5 rounded-2xl border text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-hairline)',
            color: 'var(--text-primary)',
          }}
        >
          <Smartphone className="w-4 h-4" />
          <span>Add to Home Screen</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
          >
            <div
              className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            >
              <h3 className="text-lg font-bold">Install Repeatly on iOS</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                1. Tap the <strong>Share</strong> icon in Safari’s toolbar.
                <br />
                2. Scroll down and select <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[44px] rounded-2xl text-sm font-semibold cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
