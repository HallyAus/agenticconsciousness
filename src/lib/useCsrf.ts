'use client';
import { useState, useEffect } from 'react';

export function useCsrf() {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    fetch('/api/csrf')
      .then(res => res.json())
      .then(data => setToken(data.token))
      .catch(() => {});
  }, []);

  return token;
}
