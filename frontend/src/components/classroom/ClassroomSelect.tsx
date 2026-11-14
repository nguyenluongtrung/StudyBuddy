"use client";

import { useEffect, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ClassroomSelectProps = {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
};

export default function ClassroomSelect({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
}: ClassroomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];
  const menuId = `${id}-options`;

  useEffect(() => {
    if (!open) return;
    const focusIndex = selectedIndex >= 0 && !options[selectedIndex].disabled
      ? selectedIndex
      : options.findIndex((option) => !option.disabled);
    optionRefs.current[focusIndex]?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, selectedIndex, options]);

  function choose(option: SelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveFocus(currentIndex: number, step: number) {
    if (!options.some((option) => !option.disabled)) return;
    let next = currentIndex;
    do {
      next = (next + step + options.length) % options.length;
    } while (options[next].disabled);
    optionRefs.current[next]?.focus();
  }

  function onOptionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(index, event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const next = event.key === "Home"
        ? options.findIndex((option) => !option.disabled)
        : options.findLastIndex((option) => !option.disabled);
      optionRefs.current[next]?.focus();
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      if (event.key === "Escape") {
        event.preventDefault();
        triggerRef.current?.focus();
      } else {
        triggerRef.current?.focus();
      }
    }
  }

  return (
    <div className={`classroom-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="classroom-select-trigger"
        aria-label={ariaLabel ? `${ariaLabel}: ${selected?.label || "Choose an option"}` : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={!selected || !value ? "classroom-select-placeholder" : ""}>
          {selected?.label || options[0]?.label || "Choose an option"}
        </span>
        <span className="classroom-select-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="classroom-select-menu" id={menuId} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              className="classroom-select-option"
              role="option"
              aria-selected={option.value === value}
              tabIndex={index === selectedIndex ? 0 : -1}
              disabled={option.disabled}
              onClick={() => choose(option)}
              onKeyDown={(event) => onOptionKeyDown(event, index)}
            >
              <span>{option.label}</span>
              {option.value === value && <span className="classroom-select-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
