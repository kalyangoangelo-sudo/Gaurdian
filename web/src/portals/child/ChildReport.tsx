import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { reports, PICTURE_CATEGORIES } from '../../api/client';
import Modal from '../../components/Modal';

const PICTURES = [
  { key: 'bullying', emoji: '😠', labelKey: 'cat_bullying', descKey: 'cat_bullying_desc' },
  { key: 'threats', emoji: '⛔', labelKey: 'cat_threats', descKey: 'cat_threats_desc' },
  { key: 'private_pics', emoji: '🚫', labelKey: 'cat_private_pics', descKey: 'cat_private_pics_desc' },
  { key: 'harassment', emoji: '💢', labelKey: 'cat_harassment', descKey: 'cat_harassment_desc' },
  { key: 'impersonation', emoji: '🎭', labelKey: 'cat_impersonation', descKey: 'cat_impersonation_desc' },
  { key: 'unwanted', emoji: '📨', labelKey: 'cat_unwanted', descKey: 'cat_unwanted_desc' },
  { key: 'other', emoji: '❓', labelKey: 'cat_other', descKey: 'cat_other_desc' },
];

export default function ChildReport() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [safeToContact, setSafeToContact] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ caseRef: string; recoverySecret: string } | null>(null);

  // Voice reporting
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check for speech recognition support
  useState(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setVoiceSupported(true);
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (e: any) => {
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
        }
        if (final) setDescription((prev) => (prev + ' ' + final).trim());
      };
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = () => setIsRecording(false);
    }
  });

  function toggleVoice() {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.lang = localStorage.getItem('gl_lang') === 'lg' ? 'lg-UG' : 'en-US';
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }

  function canSubmit() {
    return !!selected || description.trim() || pastedText.trim();
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);

    try {
      const category = PICTURE_CATEGORIES[selected || 'other'] || 'Other';
      let desc = '';
      if (description.trim()) desc += description.trim();
      if (pastedText.trim()) {
        if (desc) desc += '\n\n--- Pasted message ---\n';
        desc += pastedText.trim();
      }
      if (!desc) desc = `[Picture category: ${category}]`;

      // XSS-safe: strip script tags and event handlers
      desc = desc.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                 .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
                 .replace(/javascript:/gi, '')
                 .trim();

      const res = await reports.anonymous(category, desc, safeToContact);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="pt-4 animate-fade-in">
      <button onClick={() => navigate('/')} className="text-teal-dark font-semibold text-sm mb-3">‹ {t('back')}</button>
      <h2 className="view-title">{t('report_title')}</h2>
      <p className="view-subtitle">{t('report_subtitle')}</p>

      {/* Picture grid */}
      <p className="label">{t('choose_picture')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {PICTURES.map((p) => (
          <button
            key={p.key}
            onClick={() => setSelected(p.key)}
            className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-[3px] transition-all text-center ${
              selected === p.key ? 'border-teal-dark bg-teal/10' : 'border-gray-200 bg-white hover:border-teal'
            }`}
          >
            <span className="text-3xl">{p.emoji}</span>
            <span className="text-sm font-bold text-navy">{t(p.labelKey)}</span>
            <span className="text-xs text-gray-500 leading-tight">{t(p.descKey)}</span>
          </button>
        ))}
      </div>

      {/* Typed report */}
      <div className="mb-4">
        <label className="label" htmlFor="desc">{t('describe_report')}</label>
        <textarea
          id="desc"
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input resize-y"
        />
      </div>

      {/* Paste report */}
      <div className="mb-4">
        <label className="label" htmlFor="paste">{t('paste_report')}</label>
        <textarea
          id="paste"
          rows={3}
          maxLength={2000}
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          className="input resize-y"
        />
      </div>

      {/* Voice reporting */}
      {voiceSupported && (
        <div className="mb-4">
          <label className="label">{t('voice_report')}</label>
          <button
            onClick={toggleVoice}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-colors ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-teal-light text-navy'
            }`}
          >
            <span className="text-xl">{isRecording ? '⏹' : '🎤'}</span>
            <span>{isRecording ? t('voice_stop') : t('voice_start')}</span>
          </button>
        </div>
      )}

      {/* Safe to contact */}
      <div className="mb-5">
        <label className="label">{t('safe_to_contact')}</label>
        <div className="flex flex-col gap-2">
          <label className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${safeToContact ? 'border-teal bg-teal/5' : 'border-gray-200'}`}>
            <input type="radio" checked={safeToContact} onChange={() => setSafeToContact(true)} className="w-5 h-5 accent-teal-dark" />
            <span className="text-sm">{t('safe_yes')}</span>
          </label>
          <label className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${!safeToContact ? 'border-teal bg-teal/5' : 'border-gray-200'}`}>
            <input type="radio" checked={!safeToContact} onChange={() => setSafeToContact(false)} className="w-5 h-5 accent-teal-dark" />
            <span className="text-sm">{t('safe_no')}</span>
          </label>
        </div>
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} disabled={!canSubmit() || submitting} className="btn-primary">
        {submitting ? t('sending') : t('submit_report')}
      </button>

      {error && <div className="mt-3 p-3 bg-red-50 rounded-xl text-red-600 text-sm font-semibold">{error}</div>}

      {/* Success Modal */}
      <Modal show={!!result} onClose={() => { setResult(null); navigate('/'); }}>
        {result && (
          <div>
            <div className="text-5xl text-center mb-3">✅</div>
            <h2 className="text-xl font-bold text-center text-navy">{t('report_sent')}</h2>
            <p className="text-red-500 text-sm font-semibold text-center mt-2">{t('save_warning')}</p>

            <div className="my-5 space-y-4">
              <div>
                <label className="label">{t('case_ref')}</label>
                <code className="block p-3 bg-cream border-2 border-dashed border-gray-300 rounded-xl text-sm font-mono break-all">{result.caseRef}</code>
                <button onClick={() => copyToClipboard(result.caseRef)} className="btn-ghost mt-1">{t('case_ref')} → {t('copied').replace('!', '')}</button>
              </div>
              <div>
                <label className="label">{t('recovery_secret')}</label>
                <code className="block p-3 bg-cream border-2 border-dashed border-gray-300 rounded-xl text-xs font-mono break-all">{result.recoverySecret}</code>
                <button onClick={() => copyToClipboard(result.recoverySecret)} className="btn-ghost mt-1">{t('recovery_secret')} → {t('copied').replace('!', '')}</button>
              </div>
            </div>

            <div className="mb-5">
              <strong className="text-sm text-navy">{t('what_happens_next')}</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1.5 text-sm text-gray-600">
                <li>{t('next_1')}</li>
                <li>{t('next_2')}</li>
                <li>{t('next_3')}</li>
              </ol>
            </div>

            <button onClick={() => { setResult(null); navigate('/'); }} className="btn-primary">{t('done')}</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
