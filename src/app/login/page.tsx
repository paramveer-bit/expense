"use client";
import { useState } from "react";
import LoginModal from "@/components/LoginForm";
import RegisterForm from "@/components/RegisterForm";

export default function AuthPage() {
  const [showSignup, setShowSignup] = useState(false);

  return showSignup ? (
    <RegisterForm
      onClose={() => setShowSignup(false)}
      onSwitchToLogin={() => setShowSignup(false)}
    />
  ) : (
    <LoginModal
      onClose={() => {}}
      onSwitchToSignup={() => setShowSignup(true)}
    />
  );
}
