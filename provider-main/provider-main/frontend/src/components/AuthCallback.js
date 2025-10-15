import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.get('code');
        const hasHashToken = window.location.hash.includes('access_token');
        if (hasCode) {
          await supabase.auth.exchangeCodeForSession();
        } else if (hasHashToken) {
          await supabase.auth.getSessionFromUrl({ storeSession: true });
        } else {
          try { await supabase.auth.getSessionFromUrl({ storeSession: true }); } catch (e) {}
        }

        // Try up to 5 times to get the user, in case session propagation is slightly delayed
        let user = null;
        for (let i = 0; i < 10; i++) {
          const { data, error } = await supabase.auth.getUser({ forceRefresh: true });
          if (error) break;
          console.log(data)
          if (data?.user) { user = data.user; break; }
          await new Promise(r => setTimeout(r, 500));
        }
        if (isMounted && user) {
          // Clean URL before redirecting
          try { window.history.replaceState({}, document.title, `${window.location.origin}/auth/callback`); } catch {}
          localStorage.setItem('emailVerified', '1');
          toast.success('Email verified');
          // Mirror verification to backend providers table
          try {
            await fetch(`${BACKEND_URL}/api/provider/email-verified`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email }),
            });
          } catch (e) {
            // non-blocking; proceed regardless
          }
          navigate('/register/step/1', { replace: true });
          
        } else {
          // Clean URL before redirecting
          try { window.history.replaceState({}, document.title, `${window.location.origin}/auth/callback`); } catch {}
          toast.error('No active session found');
          navigate('/register/step/1', { replace: true });
        }
      } catch (err) {
        // Clean URL before redirecting
        try { window.history.replaceState({}, document.title, `${window.location.origin}/auth/callback`); } catch {}
        toast.error(err.message || 'Verification failed');
        navigate('/register/step/1', { replace: true });
      }
    })();
    return () => { isMounted = false; };
  }, [navigate]);

  return null;
}
