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

        // Capture query params BEFORE cleaning the URL
        const currentUrl = new URL(window.location.href);
        const incomingType = currentUrl.searchParams.get('type');

        // STEP 3 — Get final session
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        // Clean up URL (after we've captured the type)
        try {
          window.history.replaceState({}, document.title, `${window.location.origin}/auth/callback`);
        } catch {}

        if (sessionError) {
          toast({ title: 'Verification', description: sessionError.message, variant: 'destructive' });
          navigate('/login', { replace: true });
          return;
        }

        if (isMounted) {
          // Handle password recovery: redirect to reset-password form
          if (incomingType === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }
          const session = sessionData?.session;
          const hasSession = !!session;
          if (!hasSession) {
            toast({ title: 'Email verified', description: 'You can now log in.', variant: 'default' });
            navigate('/login', { replace: true });
            return;
          }

          const provider = session.user?.app_metadata?.provider || (Array.isArray(session.user?.identities) && session.user.identities[0]?.provider) || null;
          if (provider === 'google') {
            try {
              // Fetch role and minimal profile
              const { data: prof } = await supabase
                .from('profiles')
                .select('role, full_name, phone')
                .eq('id', session.user.id)
                .maybeSingle();
              const roleFromDb = prof?.role || 'user';
              // Persist minimal info
              localStorage.setItem('user', JSON.stringify({ id: session.user.id, email: session.user.email, fullName: prof?.full_name }));
              localStorage.setItem('role', roleFromDb);
              localStorage.setItem('isVerified', 'true');
              toast({ title: 'Signed in with Google', description: 'Welcome!', variant: 'default' });
              const providerUrl = process.env.REACT_APP_PROVIDER_URL;
              if (roleFromDb === 'provider' && providerUrl) {
                window.location.href = providerUrl;
              } else {
                navigate('/dashboard', { replace: true });
              }
            } catch (e) {
              // Fallback to dashboard
              navigate('/dashboard', { replace: true });
            }
          } else {
            // Email link confirmation or other providers -> send to Login as per requirement
            toast({ title: 'Email verified', description: 'You can now log in.', variant: 'default' });
            navigate('/login', { replace: true });
          }
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
