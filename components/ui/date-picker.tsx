'use client'

import * as React from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar, type CalendarProps } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type DatePickerProps = {
  id?: string
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  buttonClassName?: string
  fromDate?: Date
  toDate?: Date
  calendarProps?: Omit<CalendarProps, 'mode' | 'selected' | 'onSelect' | 'locale'>
}

function parseDate(value?: string) {
  if (!value) return undefined
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : undefined
}

function toDateValue(date?: Date) {
  if (!date || !isValid(date)) return ''
  return format(date, 'yyyy-MM-dd')
}

export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = 'Selecciona una fecha',
  disabled,
  required,
  className,
  buttonClassName,
  fromDate,
  toDate,
  calendarProps,
}: DatePickerProps) {
  const isControlled = value !== undefined
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '')

  React.useEffect(() => {
    if (isControlled) {
      setInternalValue(value ?? '')
    }
  }, [isControlled, value])

  const selectedValue = isControlled ? value ?? '' : internalValue
  const selectedDate = parseDate(selectedValue)

  const updateValue = React.useCallback((nextValue: string) => {
    if (!isControlled) {
      setInternalValue(nextValue)
    }
    onChange?.(nextValue)
  }, [isControlled, onChange])

  const handleSelect = React.useCallback((date?: Date) => {
    updateValue(toDateValue(date))
    setOpen(false)
  }, [updateValue])

  const handleToday = React.useCallback(() => {
    updateValue(toDateValue(new Date()))
    setOpen(false)
  }, [updateValue])

  const handleClear = React.useCallback(() => {
    updateValue('')
    setOpen(false)
  }, [updateValue])

  return (
    <div className={cn('relative', className)}>
      {name ? <input type="hidden" name={name} value={selectedValue} required={required} readOnly /> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-required={required}
            className={cn(
              'h-10 w-full justify-between rounded-md border-input bg-background px-3 font-normal text-foreground hover:bg-accent/40',
              !selectedDate && 'text-muted-foreground',
              buttonClassName,
            )}
          >
            <span className="flex min-w-0 items-center gap-2 overflow-hidden">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">
                {selectedDate ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es }) : placeholder}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-xl border-border p-0 shadow-xl">
          <div className="border-b border-border bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Calendario
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) : 'Elige una fecha'}
            </p>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={es}
            fromDate={fromDate}
            toDate={toDate}
            initialFocus
            className="p-3"
            {...calendarProps}
          />
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-3 py-2">
            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={handleClear}>
              Limpiar
            </Button>
            <Button type="button" variant="secondary" size="sm" className="text-xs" onClick={handleToday}>
              Hoy
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
