import { forwardRef, type InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}

/**
 * Campo importo: tastiera decimale su iPhone, accetta virgola e punto.
 * Il valore resta testo; la conversione in centesimi avviene con parseAmount.
 */
export const AmountInput = forwardRef<HTMLInputElement, Props>(function AmountInput(
  { value, onChange, invalid, className = '', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      enterKeyHint="done"
      value={value}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
      className={`w-full bg-transparent outline-none placeholder:text-muted/60 ${className}`}
      {...rest}
    />
  )
})
