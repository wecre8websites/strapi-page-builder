import { Combobox, ComboboxOption } from '@strapi/design-system';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SearchOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Must be memoised on whatever changes the result set (content type, locale). A new function refetches. */
  fetchOptions: (query: string) => Promise<SearchOption[]>;
  placeholder?: string;
  size?: 'S' | 'M';
  optionStyle?: React.CSSProperties;
  /** Always shown, never filtered by the search (e.g. "Create new", "Blank"). */
  leadingOptions?: SearchOption[];
  trailingOptions?: SearchOption[];
  disabled?: boolean;
  /** Options the parent already has (e.g. the selected entry), so its label shows even when a search would not return it. */
  knownOptions?: SearchOption[];
};

/**
 * Searchable, self-contained combobox. Owns its query and results so a search here can never narrow
 * another control's list, and remembers labels so the selected item keeps its name while searching.
 */
export default function SearchCombobox({ value, onChange, fetchOptions, placeholder, size = 'S', optionStyle, leadingOptions = [], trailingOptions = [], disabled, knownOptions = [] }: Props) {
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const labels = useRef<Record<string, string>>({});
  const request = useRef(0);
  [...knownOptions, ...leadingOptions, ...trailingOptions, ...options].forEach(o => { labels.current[o.value] = o.label });
  const selectedLabel = labels.current[value] ?? '';

  // typing the selected label back (Combobox echoes it on select) is not a search
  const effectiveQuery = query === undefined || query === selectedLabel ? '' : query;

  useEffect(() => {
    const id = ++request.current;
    const timer = setTimeout(() => {
      setLoading(true);
      fetchOptions(effectiveQuery)
        .then(result => { if (id === request.current) setOptions(result || []); })
        .catch(() => { if (id === request.current) setOptions([]); })
        .finally(() => { if (id === request.current) setLoading(false); });
    }, effectiveQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [effectiveQuery, fetchOptions]);

  const select = useCallback((next?: string) => {
    setQuery(undefined);
    onChange(next ?? '');
  }, [onChange]);

  const all = [...leadingOptions, ...options.filter(o => !leadingOptions.some(l => l.value === o.value)), ...trailingOptions];
  return (
    <Combobox
      autocomplete="none"
      size={size}
      disabled={disabled}
      loading={loading}
      placeholder={placeholder}
      value={value || ''}
      textValue={query ?? selectedLabel}
      onTextValueChange={(text: string) => setQuery(text)}
      onChange={(next?: string) => { if (next !== undefined) select(next); }}
      onClear={() => setQuery(undefined)}
      onOpenChange={(open: boolean) => { if (open) setQuery(undefined); }}
    >
      {all.map(o => (
        <ComboboxOption key={o.value} value={o.value} textValue={o.label} style={optionStyle}>{o.label}</ComboboxOption>
      ))}
    </Combobox>
  );
}
