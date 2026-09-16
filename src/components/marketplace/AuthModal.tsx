import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import { Modal } from '../common/Modal.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signup',
}) => {
  const { sendOtp, verifyOtp } = useAuth();
  const { companyName } = useBranding();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  // Phone input state
  const [rawPhone, setRawPhone] = useState('');
  const [fullName, setFullName] = useState('');

  // OTP input state (6 separate boxes)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer & feedback
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial mode
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setStep('phone');
      setRawPhone('');
      setFullName('');
      setOtpDigits(['', '', '', '', '', '']);
      setErrorMessage(null);
      setResendCountdown(0);
    }
  }, [isOpen, initialMode]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  if (!isOpen) return null;

  // Format 10-digit phone for display (e.g. 98765 00000)
  const formatPhoneInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setRawPhone(digits);
  };

  const getFormattedPhone = () => {
    if (rawPhone.length <= 5) return rawPhone;
    return `${rawPhone.slice(0, 5)} ${rawPhone.slice(5)}`;
  };

  // Masked phone for display in OTP screen (e.g. +91 98*** **000)
  const getMaskedPhone = () => {
    if (rawPhone.length !== 10) return `+91 ${rawPhone}`;
    return `+91 ${rawPhone.slice(0, 2)}*** **${rawPhone.slice(7)}`;
  };

  const fullPhoneNumber = `+91${rawPhone}`;

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (rawPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await sendOtp(fullPhoneNumber, mode === 'login' ? 'LOGIN' : 'REGISTER');
      setIsSubmitting(false);
      setStep('otp');
      setResendCountdown(30);
      setOtpDigits(['', '', '', '', '', '']);
      // Focus first OTP input
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Unable to dispatch OTP. Please check your mobile number.');
    }
  };

  // Handle Resend OTP
  const handleResend = async () => {
    if (resendCountdown > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await sendOtp(fullPhoneNumber, mode === 'login' ? 'LOGIN' : 'REGISTER');
      setIsSubmitting(false);
      setResendCountdown(30);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Unable to resend OTP code. Please try again shortly.');
    }
  };

  // OTP box input handling
  const handleOtpChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  // Handle OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await verifyOtp(
        fullPhoneNumber,
        code,
        mode === 'login' ? 'LOGIN' : 'REGISTER',
        fullName.trim() || undefined
      );
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Invalid or expired OTP code. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      maxWidthClass="max-w-md"
      className="overflow-hidden relative"
    >
      {/* Close Button: 44x44px accessible */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-all z-10 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
        aria-label="Close modal"
        data-testid="modal-close-button"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>

        {/* Back Button (Only on OTP step) */}
        {step === 'otp' && (
          <button
            onClick={() => {
              setStep('phone');
              setErrorMessage(null);
            }}
            className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors z-10"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="p-8">
          {/* Header Brand Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-primary to-slate-900 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-brand-primary/25">
              Z
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SCREEN 1: MOBILE NUMBER INPUT */}
          {step === 'phone' ? (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {mode === 'signup'
                    ? `Create your ${companyName} account`
                    : `Login to your ${companyName} account`}
                </h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  Enter your mobile number to continue
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                {/* Required Full Name (for Sign Up) */}
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-fullname-input"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      FULL NAME <span className="text-brand-danger font-bold">*</span>
                    </label>
                    <input
                      id="auth-fullname-input"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errorMessage && errorMessage.toLowerCase().includes('name')) {
                          setErrorMessage(null);
                        }
                      }}
                      placeholder="e.g. Rahul Sharma"
                      data-testid="auth-fullname-input"
                      className={`w-full px-4 py-3 bg-slate-50 border ${
                        errorMessage && errorMessage.toLowerCase().includes('name')
                          ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30'
                          : 'border-slate-200'
                      } rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all`}
                    />
                    {errorMessage && errorMessage.toLowerCase().includes('name') && (
                      <span className="text-rose-600 text-xs font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Full name is required to register
                      </span>
                    )}
                  </div>
                )}

                {/* Mobile Number Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:bg-white focus-within:border-brand-primary focus-within:ring-4 focus-within:ring-brand-primary/10 transition-all">
                    <div className="flex items-center gap-1.5 px-3.5 py-3 border-r border-slate-200 bg-slate-100/70 text-slate-700 font-bold text-sm select-none shrink-0">
                      <span className="text-base" role="img" aria-label="India flag">🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={getFormattedPhone()}
                      onChange={(e) => formatPhoneInput(e.target.value)}
                      placeholder="98765 00000"
                      className="w-full px-4 py-3 bg-transparent text-slate-900 font-semibold text-base tracking-wide placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 pl-1">
                    We'll send a 6-digit verification code to your phone.
                  </p>
                </div>

                {/* Send OTP Button */}
                <button
                  type="submit"
                  data-testid="auth-submit-btn"
                  disabled={isSubmitting || rawPhone.length !== 10}
                  className="w-full min-h-[48px] py-3.5 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold text-sm shadow-primary hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <span>Send OTP</span>
                  )}
                </button>
              </form>

              {/* Mode Switcher */}
              <div className="text-center mt-6 pt-5 border-t border-slate-100 text-xs text-slate-600">
                {mode === 'signup' ? (
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage(null);
                      }}
                      className="font-bold text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors"
                    >
                      Login
                    </button>
                  </p>
                ) : (
                  <p>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMessage(null);
                      }}
                      className="font-bold text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors"
                    >
                      Sign Up
                    </button>
                  </p>
                )}
              </div>

              {/* Terms & Privacy */}
              <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed">
                By continuing, you confirm that you agree to {companyName}'s{' '}
                <span className="underline cursor-pointer hover:text-slate-600">Terms of Use</span> and{' '}
                <span className="underline cursor-pointer hover:text-slate-600">Privacy Policy</span>.
              </p>
            </div>
          ) : (
            /* SCREEN 2: OTP VERIFICATION */
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary-light text-brand-primary text-xs font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Secure Verification</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Verify your mobile number
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Enter the 6-digit OTP sent to{' '}
                  <span className="font-bold text-slate-800">{getMaskedPhone()}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* 6 Individual OTP Boxes */}
                <div
                  className="flex justify-center gap-2 sm:gap-3"
                  onPaste={handleOtpPaste}
                >
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-bold text-xl sm:text-2xl rounded-2xl border-2 transition-all focus:outline-none ${
                        digit
                          ? 'border-brand-primary bg-brand-primary-light/30 text-brand-primary'
                          : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-brand-primary focus:bg-white focus:ring-4 focus:ring-brand-primary/10'
                      }`}
                    />
                  ))}
                </div>

                {/* Verify & Continue Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || otpDigits.join('').length !== 6}
                  className="w-full min-h-[48px] py-3.5 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold text-sm shadow-primary hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </button>
              </form>

              {/* Resend OTP & Edit Number Options */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2.5 text-xs">
                <div>
                  {resendCountdown > 0 ? (
                    <span className="text-slate-400 font-medium">
                      Resend OTP in <strong className="text-slate-700">{resendCountdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleResend}
                      className="font-bold text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setErrorMessage(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 font-semibold hover:underline transition-colors"
                >
                  Wrong number? Edit mobile number
                </button>
              </div>
            </div>
          )}
        </div>
    </Modal>
  );
};
