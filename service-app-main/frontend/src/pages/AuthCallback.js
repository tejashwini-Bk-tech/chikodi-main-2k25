import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../hooks/use-toast';
import { supabase } from '../lib/supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        // STEP 1 — Try PKCE/OAuth (code-based)
        const { data: codeSession, error: codeError } =
          await supabase.auth.exchangeCodeForSession(window.location.href);

        if (codeError) console.log('No code exchange needed:', codeError.message);

        // STEP 2 — Try URL fragment-based session (email verification flow)
        const urlHash = window.location.hash;
        if (urlHash.includes('access_token')) {
          const params = new URLSearchParams(urlHash.replace('#', '?'));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { data: hashSession, error: hashError } =
              await supabase.auth.setSession({ access_token, refresh_token });
            if (hashError) throw hashError;
            console.log('Session set from email verification:', hashSession);
          }
        }

        // STEP 3 — Get final session
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        // Clean up URL
        try {
          window.history.replaceState({}, document.title, `${window.location.origin}/auth/callback`);
        } catch {}

        if (sessionError) {
          toast({ title: 'Verification', description: sessionError.message, variant: 'destructive' });
          navigate('/login', { replace: true });
          return;
        }

        if (isMounted) {
          const hasSession = !!sessionData?.session;
          // Regardless of session presence, send user to Login as requested
          const desc = hasSession ? 'You are now signed in. Please log in again.' : 'You can now log in.';
          toast({ title: 'Email verified', description: desc, variant: 'default' });
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        toast({ title: 'Verification failed', description: String(err), variant: 'destructive' });
        navigate('/login', { replace: true });
      }
    })();

    return () => { isMounted = false; };
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-lg text-slate-600">Verifying your email...</p>
    </div>
  );
};

export default AuthCallback;
