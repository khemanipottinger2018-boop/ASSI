'use client';

import { useEffect, useState } from 'react';
import LoginModal from '@/components/shared/ui/LoginModal';
import SignupModal from '@/components/shared/ui/SignupModal';

export default function AuthModals() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  useEffect(() => {
    function handleOpenLogin() {
      setSignupOpen(false);
      setLoginOpen(true);
    }

    function handleOpenSignup() {
      setLoginOpen(false);
      setSignupOpen(true);
    }

    window.addEventListener('assi:open-login', handleOpenLogin);
    window.addEventListener('assi:open-signup', handleOpenSignup);

    return () => {
      window.removeEventListener('assi:open-login', handleOpenLogin);
      window.removeEventListener('assi:open-signup', handleOpenSignup);
    };
  }, []);

  return (
    <>
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        switchToSignup={() => {
          setLoginOpen(false);
          setSignupOpen(true);
        }}
      />

      <SignupModal
        isOpen={signupOpen}
        onClose={() => setSignupOpen(false)}
        switchToLogin={() => {
          setSignupOpen(false);
          setLoginOpen(true);
        }}
      />
    </>
  );
}
