"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type ExamDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const longDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ExamDatePicker({ value, onChange }: ExamDatePickerProps) {
  const today = new Date();
  const todayKey = dateKey(today);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [focusedDate, setFocusedDate] = useState(todayKey);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const focusDay = () =>
      containerRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`)
        ?.focus();
    const frame = requestAnimationFrame(focusDay);
    return () => cancelAnimationFrame(frame);
  }, [open, focusedDate, visibleMonth]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function showCalendar() {
    if (open) {
      setOpen(false);
      return;
    }
    const focus = value && value >= todayKey ? parseDate(value) : today;
    setVisibleMonth(new Date(focus.getFullYear(), focus.getMonth(), 1));
    setFocusedDate(dateKey(focus));
    setOpen(true);
  }

  function changeMonth(offset: number) {
    const next = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + offset,
      1,
    );
    const firstAvailable = dateKey(next) < todayKey ? today : next;
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    setFocusedDate(dateKey(firstAvailable));
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, day: Date) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    let next: Date;
    if (event.key in offsets)
      next = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate() + offsets[event.key],
      );
    else if (event.key === "Home")
      next = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate() - day.getDay(),
      );
    else if (event.key === "End")
      next = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate() + 6 - day.getDay(),
      );
    else return;
    event.preventDefault();
    if (dateKey(next) < todayKey) next = today;
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    setFocusedDate(dateKey(next));
  }

  const firstDay = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  );
  const start = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    1 - firstDay.getDay(),
  );
  const days = Array.from(
    { length: 42 },
    (_, index) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
  const previousMonthDisabled =
    dateKey(new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0)) <
    todayKey;

  return (
    <div
      className="exam-date-picker"
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        id="exam-date"
        className={`exam-date-trigger${value ? " has-date" : ""}`}
        type="button"
        ref={triggerRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="exam-calendar"
        onClick={showCalendar}
      >
        <span className="exam-date-trigger-icon" aria-hidden="true">
          ✦
        </span>
        <span>
          {value ? longDate(parseDate(value)) : "Choose your exam day"}
        </span>
        <span className="exam-date-trigger-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div
          id="exam-calendar"
          className="exam-calendar"
          role="dialog"
          aria-label="Choose exam date"
        >
          <div className="exam-calendar-banner">
            <span aria-hidden="true">✦</span> Mark your big day{" "}
            <span aria-hidden="true">✦</span>
          </div>
          <div className="exam-calendar-header">
            <button
              type="button"
              aria-label="Previous month"
              disabled={previousMonthDisabled}
              onClick={() => changeMonth(-1)}
            >
              ‹
            </button>
            <strong>
              {visibleMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
            >
              ›
            </button>
          </div>
          <div
            className="exam-calendar-grid"
            role="group"
            aria-label={visibleMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          >
            {weekdays.map((day) => (
              <span className="exam-calendar-weekday" key={day}>
                {day}
              </span>
            ))}
            {days.map((day) => {
              const key = dateKey(day);
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              const past = key < todayKey;
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  data-date={key}
                  className={`exam-calendar-day${inMonth ? "" : " outside-month"}${key === todayKey ? " today" : ""}${selected ? " selected" : ""}`}
                  aria-label={longDate(day)}
                  aria-pressed={selected}
                  disabled={past}
                  tabIndex={key === focusedDate ? 0 : -1}
                  onKeyDown={(event) => moveFocus(event, day)}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
