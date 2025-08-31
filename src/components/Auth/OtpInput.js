import React, { useState, useRef, useEffect } from 'react';
import './Auth.css';

const OtpInput = ({ 
  length = 6, 
  value = '', 
  onChange, 
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true 
}) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);

  // Initialize refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value !== otp.join('')) {
      const newOtp = value.split('').slice(0, length);
      while (newOtp.length < length) {
        newOtp.push('');
      }
      setOtp(newOtp);
    }
  }, [value, length]);

  const handleChange = (element, index) => {
    if (disabled) return;

    const val = element.value;
    
    // Only allow single digit
    if (val.length > 1) {
      element.value = val.slice(-1);
      return;
    }

    // Only allow numbers
    if (val && !/^\d$/.test(val)) {
      element.value = '';
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    const otpString = newOtp.join('');
    onChange?.(otpString);

    // Auto-advance to next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits filled
    if (otpString.length === length && !otpString.includes('')) {
      onComplete?.(otpString);
    }
  };

  const handleKeyDown = (e, index) => {
    if (disabled) return;

    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];
      
      if (otp[index]) {
        // Clear current field
        newOtp[index] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
      } else if (index > 0) {
        // Move to previous field and clear it
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Handle delete key
    if (e.key === 'Delete') {
      e.preventDefault();
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      onChange?.(newOtp.join(''));
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain');
    const pastedDigits = pastedData.replace(/\D/g, '').slice(0, length);
    
    if (pastedDigits) {
      const newOtp = new Array(length).fill('');
      for (let i = 0; i < pastedDigits.length; i++) {
        newOtp[i] = pastedDigits[i];
      }
      
      setOtp(newOtp);
      const otpString = newOtp.join('');
      onChange?.(otpString);

      // Focus appropriate input
      const nextEmptyIndex = newOtp.findIndex(digit => digit === '');
      const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
      inputRefs.current[focusIndex]?.focus();

      // Call onComplete if all digits filled
      if (pastedDigits.length === length) {
        onComplete?.(otpString);
      }
    }
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  return (
    <div className="otp-input-container">
      <div className={`otp-input-group ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(e.target, index)}
            onKeyDown={e => handleKeyDown(e, index)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            disabled={disabled}
            className={`otp-input-digit ${digit ? 'filled' : ''}`}
            aria-label={`Digit ${index + 1} of ${length}`}
            autoComplete="off"
          />
        ))}
      </div>
    </div>
  );
};

export default OtpInput;
