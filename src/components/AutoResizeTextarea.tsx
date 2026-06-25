"use client";

import { useEffect, useRef, TextareaHTMLAttributes } from "react";

interface AutoResizeTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

export default function AutoResizeTextarea({ 
  value, 
  onChange, 
  className = "", 
  rows = 1,
  ...props 
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    // Set height based on scrollHeight, ensuring a minimum height or padding is respected
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        if (onChange) onChange(e);
        adjustHeight();
      }}
      rows={rows}
      className={`w-full resize-none overflow-hidden transition-all duration-100 ${className}`}
      {...props}
    />
  );
}
