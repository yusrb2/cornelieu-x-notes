import type { JSX, RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface AutoResizeTextareaProps {
  value: string;
  onInputValue: (next: string) => void;
  placeholder?: string;
  ariaLabel: string;
  minRows?: number;
  className?: string;
  style?: JSX.CSSProperties;
  inputRef?: RefObject<HTMLTextAreaElement>;
  onFocusField?: () => void;
}

export function AutoResizeTextarea({
  value,
  onInputValue,
  placeholder,
  ariaLabel,
  minRows = 2,
  className = '',
  style,
  inputRef,
  onFocusField,
}: AutoResizeTextareaProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = inputRef ?? internalRef;

  const syncHeight = () => {
    const el = resolvedRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    const raf = requestAnimationFrame(syncHeight);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  useEffect(() => {
    const onResize = () => requestAnimationFrame(syncHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <textarea
      ref={resolvedRef}
      rows={minRows}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
      onFocus={() => onFocusField?.()}
      onInput={(e) => {
        const target = e.currentTarget;
        onInputValue(target.value);
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
      }}
      style={{
        width: '100%',
        resize: 'none',
        overflow: 'hidden',
        border: 'none',
        backgroundColor: 'transparent',
        outline: 'none',
        padding: 0,
        margin: 0,
        font: 'inherit',
        lineHeight: 'inherit',
        letterSpacing: 'inherit',
        color: 'inherit',
        ...style,
      }}
    />
  );
}
