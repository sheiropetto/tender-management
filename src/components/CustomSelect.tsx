"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select option",
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-left text-sm text-zinc-800 hover:border-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors cursor-pointer select-none"
      >
        <span className={selectedOption ? "text-zinc-800" : "text-zinc-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 stroke-[1.5] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Options Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 w-full rounded-xl border border-zinc-200 bg-white py-1 shadow-lg max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center px-3.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                option.value === value
                  ? "bg-zinc-50 font-medium text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50/50 hover:text-zinc-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
