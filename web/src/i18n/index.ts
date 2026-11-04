import { useState, useEffect, useCallback } from 'react';
import { en } from './en';
import { lg } from './lg';
import type { Lang } from '../types';

const DICTS: Record<Lang, Record<string, string>> = { en, lg };

export function useTranslation() {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('gl_lang') as Lang | null;
    if (saved === 'en' || saved === 'lg') setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('gl_lang', l);
  }, []);

  const toggleLang = useCallback(() => {
    const next = lang === 'en' ? 'lg' : 'en';
    setLang(next);
  }, [lang, setLang]);

  const t = useCallback(
    (key: string): string => {
      const dict = DICTS[lang];
      return dict[key] || DICTS.en[key] || key;
    },
    [lang]
  );

  return { t, lang, setLang, toggleLang };
}
