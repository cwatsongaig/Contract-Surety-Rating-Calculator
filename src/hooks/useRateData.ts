import { useState, useCallback } from 'react';
import type { RateData } from '../types/rates';
import { loadFromFile, loadFromUrl } from '../services/excelLoader';

interface UseRateDataReturn {
  data: RateData | null;
  loading: boolean;
  error: string | null;
  loadFile: (file: File) => Promise<void>;
  loadUrl: (url: string) => Promise<void>;
  lastLoaded: Date | null;
}

export function useRateData(): UseRateDataReturn {
  const [data, setData] = useState<RateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);

  const loadFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadFromFile(file);
      setData(result);
      setLastLoaded(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUrl = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadFromUrl(url);
      setData(result);
      setLastLoaded(new Date());
      localStorage.setItem('rateTableUrl', url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load from URL');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, loadFile, loadUrl, lastLoaded };
}
