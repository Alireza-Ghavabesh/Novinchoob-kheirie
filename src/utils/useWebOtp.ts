import { useEffect, useRef } from 'react';

interface UseWebOtpOptions {
  active: boolean;
  onCodeReceived: (code: string) => void;
}

/**
 * Listens for incoming domain-bound SMS OTP via the browser WebOTP API
 * (navigator.credentials.get({ otp: { transport: ['sms'] } })).
 * When the user taps "Allow / تایید" on the phone's SMS prompt, the code
 * is extracted and passed to onCodeReceived automatically.
 */
export function useWebOtp({ active, onCodeReceived }: UseWebOtpOptions): boolean {
  const callbackRef = useRef(onCodeReceived);
  callbackRef.current = onCodeReceived;

  const isSupported =
    typeof window !== 'undefined' &&
    'OTPCredential' in window &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.credentials && typeof navigator.credentials.get === 'function');

  useEffect(() => {
    if (!active || !isSupported) return;

    const ac = new AbortController();

    (navigator.credentials as any)
      .get({
        otp: { transport: ['sms'] },
        signal: ac.signal,
      })
      .then((otp: any) => {
        const rawCode = String(otp?.code || '').trim();
        const digitsOnly = rawCode.replace(/\D/g, '');
        const finalCode = digitsOnly || rawCode;
        if (finalCode) {
          callbackRef.current(finalCode);
        }
      })
      .catch(() => {
        // Silently ignore abort, timeout, or user dismissal
      });

    return () => {
      ac.abort();
    };
  }, [active, isSupported]);

  return isSupported;
}
