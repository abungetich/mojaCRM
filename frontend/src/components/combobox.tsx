import { Check, ChevronsUpDown } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
}

/** Searchable select ("select2"-style) for long option lists like Industry. */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  allowCustom = true,
  className,
}: {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  /** Allow free-text values not present in `options` (e.g. a custom industry). */
  allowCustom?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selected = options.find((o) => o.value === value)
  const label = selected?.label ?? value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
          >
            <span className="truncate">{label || placeholder}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={!allowCustom}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {allowCustom && search.trim() ? (
                <button
                  type="button"
                  className="hover:bg-muted flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm"
                  onClick={() => {
                    onChange(search.trim())
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  Use "{search.trim()}"
                </button>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {(allowCustom
                ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
                : options
              ).map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  data-checked={value === opt.value}
                  onSelect={() => {
                    onChange(opt.value)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <Check className={cn("size-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
