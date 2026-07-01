import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"))

/** Non-native date picker (Popover + Calendar) — value/onChange as "yyyy-MM-dd" strings. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const selected = value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground", className)}
          >
            <CalendarIcon className="size-4" />
            {selected ? format(selected, "PPP") : placeholder}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => date && onChange(format(date, "yyyy-MM-dd"))}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

/** Non-native date+time picker — value/onChange as ISO datetime-local strings ("yyyy-MM-ddTHH:mm"). */
export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date & time",
  className,
}: {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [datePart, timePart] = value ? value.split("T") : [undefined, undefined]
  const selected = datePart ? new Date(`${datePart}T00:00:00`) : undefined

  let hour24 = timePart ? Number(timePart.slice(0, 2)) : new Date().getHours()
  const minute = timePart ? timePart.slice(3, 5) : "00"
  const period = hour24 >= 12 ? "PM" : "AM"
  let hour12 = hour24 % 12
  if (hour12 === 0) hour12 = 12
  const hourStr = String(hour12).padStart(2, "0")

  const commit = (nextDate: Date, nextHour12: string, nextMinute: string, nextPeriod: string) => {
    let h = Number(nextHour12) % 12
    if (nextPeriod === "PM") h += 12
    const time = `${String(h).padStart(2, "0")}:${nextMinute}`
    onChange(`${format(nextDate, "yyyy-MM-dd")}T${time}`)
  }

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row", className)}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn("flex-1 justify-start font-normal", !value && "text-muted-foreground")}
            >
              <CalendarIcon className="size-4" />
              {selected ? format(selected, "PPP") : placeholder}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => date && commit(date, hourStr, minute, period)}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <div className="flex gap-2">
        <Select
          items={HOURS.map((h) => ({ value: h, label: h }))}
          value={hourStr}
          onValueChange={(v) => v && selected && commit(selected, v, minute, period)}
        >
          <SelectTrigger className="w-[4.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={MINUTES.map((m) => ({ value: m, label: m }))}
          value={minute}
          onValueChange={(v) => v && selected && commit(selected, hourStr, v, period)}
        >
          <SelectTrigger className="w-[4.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "AM", label: "AM" },
            { value: "PM", label: "PM" },
          ]}
          value={period}
          onValueChange={(v) => v && selected && commit(selected, hourStr, minute, v)}
        >
          <SelectTrigger className="w-[4.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
