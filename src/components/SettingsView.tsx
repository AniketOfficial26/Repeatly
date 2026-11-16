import { useState } from 'react';
import {
  BellRing,
  FolderCog,
  LogIn,
  LogOut,
  Moon,
  Palette,
  Play,
  RotateCcw,
  ShieldCheck,
  Sun,
  SunMoon,
  Trash2,
  Volume2,
} from 'lucide-react';
import { ACCENT_PALETTES } from '../data/defaults';
import {
  AccentId,
  AlarmTone,
  FontScale,
  ReminderPreferences,
  SurfaceStyle,
  ThemeMode,
  ThemeSettings,
} from '../types/todo';
import { alarmEngine } from '../utils/soundEngine';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  themeSettings: ThemeSettings;
  resolvedTheme: 'light' | 'dark';
  systemPrefersDark: boolean;
  onUpdateTheme: (patch: Partial<ThemeSettings>) => void;
  reminderPrefs: ReminderPreferences;
  onUpdateReminderPrefs: (patch: Partial<ReminderPreferences>) => void;
  onTestPersistentReminder: () => void;
  onOpenTabManager: () => void;
  onClearCompleted: () => void;
  completedCount: number;
  trashCount: number;
  onOpenTrash: () => void;
  userEmail: string | null;
  authLoading: boolean;
  authError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

const TONE_OPTIONS: Array<{ id: AlarmTone; label: string; desc: string }> = [
  { id: 'chime', label: 'Warm Chime', desc: 'Harmonic ascending chord' },
  { id: 'beacon', label: 'Urgent Beacon', desc: 'Crisp high-attention pulse' },
  { id: 'bell', label: 'Resonant Bell', desc: 'Clear sustained chime' },
  { id: 'pulse', label: 'Crisp Triplet', desc: 'Modern rhythmic alert' },
];

export function SettingsView({
  themeSettings,
  resolvedTheme,
  systemPrefersDark,
  onUpdateTheme,
  reminderPrefs,
  onUpdateReminderPrefs,
  onTestPersistentReminder,
  onOpenTabManager,
  onClearCompleted,
  completedCount,
  trashCount,
  onOpenTrash,
  userEmail,
  authLoading,
  authError,
  onSignIn,
  onSignOut,
}: SettingsViewProps) {
  const [notifStatus, setNotifStatus] = useState<string>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const handleToggleBrowserNotification = async () => {
    const nextEnabled = !reminderPrefs.channels.browserNotification;
    if (nextEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const res = await Notification.requestPermission();
          setNotifStatus(res);
          if (res !== 'granted') return;
        } catch {
          return;
        }
      } else if (Notification.permission === 'denied') {
        setNotifStatus('denied');
        return;
      }
    }
    onUpdateReminderPrefs({
      channels: {
        ...reminderPrefs.channels,
        browserNotification: nextEnabled,
      },
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Personalize Experience
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Theme & Reminder Settings
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Theme & UI Customization Card */}
        <section
          className="rounded-3xl border p-5 sm:p-6 space-y-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-lg font-bold">Theme & Appearance</h2>
          </div>

          {/* System / Dark / Light Mode Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Color Mode
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                System is {systemPrefersDark ? 'Dark' : 'Light'} · Active: {resolvedTheme}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'system', label: 'System', icon: SunMoon },
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'light', label: 'Light', icon: Sun },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = themeSettings.mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateTheme({ mode: opt.id as ThemeMode })}
                    className="min-h-[46px] px-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer theme-transition"
                    style={{
                      backgroundColor: active ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                      color: active ? 'var(--accent-fg)' : 'var(--text-primary)',
                      borderColor: active ? 'transparent' : 'var(--border-hairline)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color Picker */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
              Accent Palette
            </span>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(ACCENT_PALETTES) as AccentId[]).map((id) => {
                const pal = ACCENT_PALETTES[id];
                const active = themeSettings.accentId === id;
                const swatchColor = resolvedTheme === 'dark' ? pal.darkAccent : pal.lightAccent;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onUpdateTheme({ accentId: id })}
                    className="min-h-[54px] p-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer theme-transition"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: active ? swatchColor : 'var(--border-hairline)',
                      boxShadow: active ? `0 0 0 2px ${swatchColor}` : 'none',
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: swatchColor }}
                    />
                    <span className="text-[10px] font-medium truncate max-w-full">
                      {pal.name.split(' ')[1] ?? pal.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Surface Tone */}
          <div className="space-y-2">
            <span className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
              Surface Atmosphere (Low-Glare Neutrals)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'espresso', label: 'Warm Stone' },
                  { id: 'slate', label: 'Cool Slate' },
                  { id: 'contrast', label: 'High Contrast' },
                ] as const
              ).map((opt) => {
                const active = themeSettings.surfaceStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateTheme({ surfaceStyle: opt.id as SurfaceStyle })}
                    className="min-h-[42px] px-3 rounded-2xl border text-xs font-semibold cursor-pointer theme-transition"
                    style={{
                      backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-elevated)',
                      borderColor: active ? 'var(--accent)' : 'var(--border-hairline)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Format & Font Scale */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
                Clock Format
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['12h', '24h'] as const).map((fmt) => {
                  const active = themeSettings.timeFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => onUpdateTheme({ timeFormat: fmt })}
                      className="min-h-[42px] rounded-2xl border text-xs font-semibold font-mono-tabular cursor-pointer"
                      style={{
                        backgroundColor: active ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                        color: active ? 'var(--accent-fg)' : 'var(--text-primary)',
                        borderColor: active ? 'transparent' : 'var(--border-hairline)',
                      }}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
                Text Size
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['compact', 'standard', 'comfortable'] as FontScale[]).map((sc) => {
                  const active = themeSettings.fontScale === sc;
                  return (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => onUpdateTheme({ fontScale: sc })}
                      className="min-h-[42px] px-2 rounded-2xl border text-[11px] font-semibold capitalize cursor-pointer"
                      style={{
                        backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-elevated)',
                        borderColor: active ? 'var(--accent)' : 'var(--border-hairline)',
                      }}
                    >
                      {sc === 'comfortable' ? 'Large' : sc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Profile Name & Ambient Glow */}
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="profile-name" className="text-sm font-medium">
                Greeting Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={themeSettings.userName}
                onChange={(e) => onUpdateTheme({ userName: e.target.value })}
                placeholder="Your name"
                className="w-40 min-h-[40px] px-3 rounded-xl border text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium">Soft ambient radial glow</span>
              <input
                type="checkbox"
                checked={themeSettings.ambientGlow}
                onChange={(e) => onUpdateTheme({ ambientGlow: e.target.checked })}
                className="w-4 h-4"
              />
            </label>
          </div>
        </section>

        {/* Reminder Delivery & Continuous Alarm Preferences */}
        <section className="space-y-6">
          <div
            className="rounded-3xl border p-5 sm:p-6 space-y-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <BellRing className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                <h2 className="text-lg font-bold">Reminder Delivery</h2>
              </div>

              <button
                type="button"
                onClick={onTestPersistentReminder}
                className="min-h-[38px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test Alarm</span>
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Choose how scheduled tasks & recurring reminders alert you. Continuous sound loops until you manually acknowledge and dismiss the reminder.
            </p>

            {/* Channel Toggles */}
            <div className="space-y-2.5">
              {(
                [
                  {
                    key: 'sound',
                    title: 'Continuous Notification Sound',
                    desc: 'Repeats selected alarm chime until acknowledged.',
                  },
                  {
                    key: 'vibration',
                    title: 'Device Vibration',
                    desc: 'Haptic pulse loop on supported mobile browsers.',
                  },
                  {
                    key: 'persistentAlert',
                    title: 'Persistent On-Screen Alert',
                    desc: 'Locks a clear reminder dialog above your screen.',
                  },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className="rounded-2xl border p-3.5 flex items-center justify-between gap-3 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-hairline)',
                  }}
                >
                  <div>
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {item.desc}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={reminderPrefs.channels[item.key]}
                    onChange={(e) =>
                      onUpdateReminderPrefs({
                        channels: {
                          ...reminderPrefs.channels,
                          [item.key]: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 shrink-0"
                  />
                </label>
              ))}

              {/* Browser Push Notification Option */}
              <label
                className="rounded-2xl border p-3.5 flex items-center justify-between gap-3 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-hairline)',
                }}
              >
                <div>
                  <div className="text-sm font-semibold">System Browser Notification</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {notifStatus === 'denied'
                      ? 'Blocked in browser site settings'
                      : notifStatus === 'unsupported'
                      ? 'Not supported in this browser'
                      : 'Also send an OS-level notification card'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={notifStatus === 'unsupported' || notifStatus === 'denied'}
                  checked={reminderPrefs.channels.browserNotification}
                  onChange={handleToggleBrowserNotification}
                  className="w-4 h-4 shrink-0"
                />
              </label>
            </div>

            {/* Tone Selection & Volume */}
            <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
              <span className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
                Alarm Tone
              </span>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map((tone) => {
                  const active = reminderPrefs.tone === tone.id;
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => {
                        onUpdateReminderPrefs({ tone: tone.id });
                        alarmEngine.previewTone(tone.id, reminderPrefs.volume);
                      }}
                      className="p-3 rounded-2xl border text-left cursor-pointer theme-transition"
                      style={{
                        backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-elevated)',
                        borderColor: active ? 'var(--accent)' : 'var(--border-hairline)',
                      }}
                    >
                      <div className="text-xs font-bold">{tone.label}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {tone.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Volume & Snooze */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Alarm Volume</span>
                    </span>
                    <span className="font-mono-tabular">
                      {Math.round(reminderPrefs.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={reminderPrefs.volume}
                    onChange={(e) => onUpdateReminderPrefs({ volume: Number(e.target.value) })}
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium block">Snooze Duration</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[5, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => onUpdateReminderPrefs({ snoozeMinutes: mins })}
                        className="min-h-[36px] rounded-xl border text-xs font-mono-tabular font-semibold cursor-pointer"
                        style={{
                          backgroundColor:
                            reminderPrefs.snoozeMinutes === mins
                              ? 'var(--accent)'
                              : 'var(--bg-surface-elevated)',
                          color:
                            reminderPrefs.snoozeMinutes === mins
                              ? 'var(--accent-fg)'
                              : 'var(--text-primary)',
                          borderColor:
                            reminderPrefs.snoozeMinutes === mins
                              ? 'transparent'
                              : 'var(--border-hairline)',
                        }}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account & Continuous Login Sync */}
          <div
            className="rounded-3xl border p-5 sm:p-6 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                <h2 className="text-lg font-bold">Account & Cloud Sync</h2>
              </div>
            </div>

            {userEmail ? (
              <div className="space-y-3">
                <div
                  className="rounded-2xl border p-3.5 flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-hairline)',
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{userEmail}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Continuous session active · Synced with PostgreSQL
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    disabled={authLoading}
                    className="min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-hairline)',
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Sign in with Google to sync tasks, tabs, and 30-day trash across devices. You stay signed in until you tap Sign Out.
                </p>
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={authLoading}
                  className="w-full min-h-[46px] px-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-fg)',
                  }}
                >
                  <LogIn className="w-4 h-4" />
                  <span>{authLoading ? 'Signing in...' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}

            {authError && (
              <p className="text-xs text-red-500 font-medium">{authError}</p>
            )}

            <PWAInstallButton />
          </div>

          {/* Organization & 30-Day Trash Controls */}
          <div
            className="rounded-3xl border p-5 flex flex-wrap items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenTabManager}
                className="min-h-[44px] px-4 rounded-2xl border text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-hairline)',
                }}
              >
                <FolderCog className="w-4 h-4" />
                <span>Manage Custom Tabs</span>
              </button>

              <button
                type="button"
                onClick={onOpenTrash}
                className="min-h-[44px] px-4 rounded-2xl border text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-hairline)',
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>Trash (30d){trashCount > 0 ? ` · ${trashCount}` : ''}</span>
              </button>
            </div>

            {completedCount > 0 && (
              <button
                type="button"
                onClick={onClearCompleted}
                className="min-h-[44px] px-4 rounded-2xl border text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-secondary)',
                }}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear Completed ({completedCount})</span>
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
