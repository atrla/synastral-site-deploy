import { useEffect, useState } from 'react'
import { nextComboboxIndex } from '../utils/placeOptions.js'

const NO_RESULTS_HINT = "no places found — try 'city, country'"

function isSameOption(a, b) {
  if (!a || !b) return false
  return a.label === b.label && a.lat === b.lat && a.lon === b.lon
}

// ARIA 1.2 combobox (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) with
// a "list" autocomplete popup. The popup only ever renders client-side (after
// the `mounted` effect fires) so SSR — and the pre-hydration first paint —
// always produces a plain text input, with no listbox to get out of sync.
//
// Keyboard-only walkthrough (WP-3.2 manual QA — no mouse):
//   1. Tab to "place of birth". It's a plain-looking text input; nothing else
//      is announced yet (aria-expanded="false", no popup in the DOM).
//   2. Type 2+ characters (e.g. "Ber"). Once results resolve, aria-expanded
//      flips to "true" and a listbox (id "g-place-listbox") appears; while the
//      request is in flight the popup shows "searching…", and if nothing
//      matches it shows "no places found — try 'city, country'".
//   3. Press ArrowDown — activeIndex moves to the first option and
//      aria-activedescendant on the input points at it (the option gets a
//      visible highlight via .is-active). Press ArrowDown/ArrowUp repeatedly
//      to confirm it steps through every option and wraps from last back to
//      first (and first back to last on ArrowUp).
//   4. Press Enter on a highlighted option — the input fills with that
//      option's label, the popup closes, and focus stays on the input.
//      (Verified via the reducer test: the parent's selectedPlace is now the
//      chosen {label, lat, lon} object with numeric lat/lon.)
//   5. Type any character — the popup reopens for a new search and the prior
//      selection is cleared (parent dispatches CHANGE_TEXT, selectedPlace ->
//      null), so the "select one of the suggested places" hint reappears
//      until a new option is chosen.
//   6. Re-open the popup (step 2) and press Escape — the popup closes without
//      changing the input value or selection, and focus remains on the input.
//   7. Tab away (or shift+Tab back) while the popup is open — blur closes the
//      popup with no selection change, confirming focus-driven open/close
//      doesn't require a mouse.
export default function PlaceCombobox({
  id,
  value,
  onValueChange,
  options,
  loading,
  selected,
  onSelect,
  inputRef,
  placeholder,
  invalid,
  describedBy,
  autoComplete = 'off',
}) {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const listboxId = `${id}-listbox`

  useEffect(() => {
    setMounted(true)
  }, [])

  // A fresh options list invalidates whatever index was highlighted before.
  useEffect(() => {
    setActiveIndex(-1)
  }, [options])

  const openIfSearchable = (text) => {
    setIsOpen(text.trim().length >= 2)
  }

  const handleChange = (event) => {
    const text = event.target.value
    onValueChange(text)
    openIfSearchable(text)
  }

  const handleFocus = () => {
    openIfSearchable(value)
  }

  const handleBlur = () => {
    setIsOpen(false)
  }

  const selectOption = (option) => {
    onSelect(option)
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isOpen) {
        openIfSearchable(value)
        return
      }
      if (!options.length) return
      setActiveIndex((current) => nextComboboxIndex(current, options.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        openIfSearchable(value)
        return
      }
      if (!options.length) return
      setActiveIndex((current) => nextComboboxIndex(current, options.length, -1))
    } else if (event.key === 'Enter') {
      if (!isOpen) return
      event.preventDefault()
      if (activeIndex >= 0 && options[activeIndex]) {
        selectOption(options[activeIndex])
      } else {
        setIsOpen(false)
      }
    } else if (event.key === 'Escape') {
      if (!isOpen) return
      event.preventDefault()
      setIsOpen(false)
    }
  }

  const showPopup = mounted && isOpen
  const activeOptionId = activeIndex >= 0 && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined

  return (
    <div className="combobox">
      <input
        id={id}
        name="birth-place"
        type="text"
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={mounted ? isOpen : false}
        aria-controls={mounted ? listboxId : undefined}
        aria-activedescendant={showPopup ? activeOptionId : undefined}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {showPopup && (
        <ul className="combobox-popup" role="listbox" id={listboxId}>
          {loading && <li className="combobox-status mono">searching…</li>}
          {!loading && options.length === 0 && (
            <li className="combobox-status mono">{NO_RESULTS_HINT}</li>
          )}
          {!loading && options.map((option, index) => {
            const optionId = `${id}-option-${index}`
            const classes = ['combobox-option']
            if (index === activeIndex) classes.push('is-active')
            if (isSameOption(selected, option)) classes.push('is-selected')
            return (
              <li
                key={`${option.label}-${option.lat}-${option.lon}`}
                id={optionId}
                role="option"
                aria-selected={index === activeIndex}
                className={classes.join(' ')}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                {option.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
