"use client"

import * as React from "react"
import { addDays, format, parseISO } from "date-fns"
import { faIR } from "date-fns/locale"

import { cn } from "../lib/utils"
import { Calendar } from "./ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"

export function BirthDatePicker({ value, onChange, disabled }) {
  const [open, setOpen] = React.useState(false)
  const today = new Date()
  const selected = value ? parseISO(value) : undefined
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button id="birthDate" type="button" disabled={disabled} aria-required="true"
        className="btn w-full justify-between border-gray-300 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
        {selected ? format(selected, "LLL dd, y", { locale: faIR }) : 'انتخاب تاریخ تولد'}
        <svg aria-hidden="true" className="h-4 w-4 fill-current" viewBox="0 0 16 16"><path d="M5 4a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H5ZM4 0a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4H4ZM2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z" /></svg>
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start" aria-label="انتخاب تاریخ تولد">
      <Calendar mode="single" required selected={selected} captionLayout="dropdown"
        classNames={{
          dropdowns: 'flex items-center gap-2 px-6',
          dropdown_root: 'inline-flex',
          dropdown: 'h-8 w-24 rounded-md border-gray-200 py-1 pl-7 pr-2 text-xs dark:border-gray-700 dark:bg-gray-800',
          caption_label: 'hidden',
        }}
        defaultMonth={selected || new Date(today.getFullYear() - 25, 0, 1)}
        startMonth={new Date(today.getFullYear() - 120, 0, 1)} endMonth={today}
        disabled={{ after: today }}
        onSelect={date => { if (date) { onChange(format(date, 'yyyy-MM-dd')); setOpen(false) } }} />
    </PopoverContent>
  </Popover>
}

export default function DatePickerWithRange({
  className,
}) {
  const [date, setDate] = React.useState({
    from: new Date(2022, 0, 20),
    to: addDays(new Date(2022, 0, 20), 20),
  })

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            id="date"
            className={cn(
              "btn px-2.5 min-w-[15.5rem] bg-white border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 dark:bg-gray-800 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 font-medium text-left justify-start",
              !date && "text-muted-foreground"
            )}
          >
            {/* <CalendarIcon /> */}
            <svg className="fill-current text-gray-400 dark:text-gray-500 ml-1 mr-2" width="16" height="16" viewBox="0 0 16 16">
              <path d="M5 4a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H5Z"></path>
              <path d="M4 0a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4H4ZM2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z"></path>
            </svg>
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: faIR })} -{" "}
                  {format(date.to, "LLL dd, y", { locale: faIR })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: faIR })
              )
            ) : (
              <span>انتخاب تاریخ</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
