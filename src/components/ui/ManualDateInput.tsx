"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/cn";

function formatDigitsAsDate(digits: string): string {
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);

  if (digits.length <= 2) return mm;
  if (digits.length <= 4) return `${mm}/${dd}`;
  return `${mm}/${dd}/${yyyy}`;
}

function formatIsoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function parseDisplayDate(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (month < 1 || month > 12 || day < 1 || year < 1000) return null;

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface ManualDateInputProps {
  value: string;
  onChange: (nextValue: string) => void;
  className?: string;
  wrapperClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  showPickerButton?: boolean;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function ManualDateInput({
  value,
  onChange,
  className,
  wrapperClassName,
  placeholder = "MM/DD/YYYY",
  disabled = false,
  autoFocus = false,
  showPickerButton = true,
  onBlur,
  onKeyDown,
}: ManualDateInputProps) {
  const [text, setText] = useState(() => formatIsoDate(value));
  const nativePickerRef = useRef<HTMLInputElement | null>(null);
  const formattedValue = useMemo(() => formatIsoDate(value), [value]);

  useEffect(() => {
    setText(formattedValue);
  }, [formattedValue]);

  return (
    <div className={cn("flex items-center gap-2", wrapperClassName)}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        autoFocus={autoFocus}
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
          const nextText = formatDigitsAsDate(digits);
          setText(nextText);

          if (!nextText) {
            onChange("");
            return;
          }

          const iso = parseDisplayDate(nextText);
          if (iso) onChange(iso);
        }}
        onBlur={(event) => {
          if (!text.trim()) {
            setText("");
            onChange("");
            onBlur?.(event);
            return;
          }

          const iso = parseDisplayDate(text);
          if (iso) {
            const normalized = formatIsoDate(iso);
            setText(normalized);
            onChange(iso);
          } else {
            setText(formattedValue);
          }

          onBlur?.(event);
        }}
        onKeyDown={onKeyDown}
        className={cn("min-w-0", className)}
      />

      {showPickerButton && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const input = nativePickerRef.current;
              if (!input) return;
              if (typeof input.showPicker === "function") {
                input.showPicker();
              } else {
                input.click();
              }
            }}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.03] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white/82 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Open calendar picker"
          >
            <Calendar size={15} />
          </button>
          <input
            ref={nativePickerRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            value={value}
            onChange={(event) => {
              const nextValue = event.target.value;
              onChange(nextValue);
              setText(formatIsoDate(nextValue));
            }}
          />
        </>
      )}
    </div>
  );
}
