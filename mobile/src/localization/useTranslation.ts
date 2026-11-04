import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en } from './en';
import { lg } from './lg';

type Lang = 'en' | 'lg';
type K = keyof typeof en;

const T = { en, lg } as const;

export function useTranslation() {
  const [lang, setL] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem('app_language').then(s => {
      if (s === 'en' || s === 'lg') setL(s as Lang);
    });
  }, []);

  const setLang = useCallback(async (n: Lang) => {
    setL(n);
    await AsyncStorage.setItem('app_language', n);
  }, []);

  const t = useCallback(
    (k: K): string => {
      return (T[lang] as Record<string, string>)[k] ??
        (T.en as Record<string, string>)[k] ??
        k;
    },
    [lang],
  );

  return { t, lang, setLang };
}
