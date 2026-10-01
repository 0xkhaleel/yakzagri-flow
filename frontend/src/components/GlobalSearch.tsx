"use client";
import { t as translateCopy } from "@/lib/i18n";


import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type SearchResultItem } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { nextTrapTarget } from "@/lib/a11y/focusTrap";

interface GroupedResults {
  trades: SearchResultItem[];
  users: SearchResultItem[];
  contracts: SearchResultItem[];
}

const EMPTY_RESULTS: GroupedResults = { trades: [], users: [], contracts: [] };

const CATEGORY_LABELS: Record<keyof GroupedResults, string> = {
  trades: "Trades",
  users: "Users",
  contracts: "Contracts",
};

/** Id of the listbox popup the combobox controls. */
const RESULTS_LISTBOX_ID = "global-search-results";
/** Id of the "type to search" hint that describes the empty combobox. */
const SEARCH_HINT_ID = "global-search-hint";
/** How many rows a PageUp/PageDown jump moves through the result list. */
const PAGE_JUMP = 10;

interface GlobalSearchProps {
  /** Called when the overlay is dismissed without a selection */
  onClose?: () => void;
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allItems = [
    ...results.trades.map((r) => ({ ...r, category: "trades" as const })),
    ...results.users.map((r) => ({ ...r, category: "users" as const })),
    ...results.contracts.map((r) => ({ ...r, category: "contracts" as const })),
  ];

  const hasResults =
    results.trades.length > 0 ||
    results.users.length > 0 ||
    results.contracts.length > 0;

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setResults(EMPTY_RESULTS);
    setError(null);
    setActiveIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
    setActiveIndex(-1);
    onClose?.();
  }, [onClose]);

  // Focus return: whenever the overlay closes, hand focus back to the trigger
  // that opened it (ESC, the ESC button, backdrop click and selection all
  // funnel through `close`, so every dismissal path restores focus).
  useEffect(() => {
    if (!isOpen && wasOpenRef.current) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      setResults(EMPTY_RESULTS);
      setError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!token) {
        setError("Please sign in to search");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await api.search.query(token, query.trim());
        setResults(data);
        setActiveIndex(-1);
      } catch {
        setError("Search failed. Please try again.");
        setResults(EMPTY_RESULTS);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, token]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeIndex < 0) return;
    const active = document.getElementById(`search-result-${activeIndex}`);
    active?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, isOpen]);

  function handleSelect(item: SearchResultItem & { category: keyof GroupedResults }) {
    const routes: Record<keyof GroupedResults, string> = {
      trades: `/trades/${encodeURIComponent(item.id)}`,
      users: `/reputation/${encodeURIComponent(item.id)}`,
      contracts: `/streams/${encodeURIComponent(item.id)}`,
    };
    router.push(routes[item.category]);
    close();
  }

  function handleKeyNavigation(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) =>
        allItems.length === 0 ? -1 : Math.min(i + 1, allItems.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(allItems.length === 0 ? -1 : 0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(allItems.length === 0 ? -1 : allItems.length - 1);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setActiveIndex((i) =>
        allItems.length === 0
          ? -1
          : Math.min(Math.max(i, -1) + PAGE_JUMP, allItems.length - 1),
      );
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        allItems.length === 0 ? -1 : Math.max(i - PAGE_JUMP, 0),
      );
    } else if (e.key === "Enter" && activeIndex >= 0 && allItems[activeIndex]) {
      e.preventDefault();
      handleSelect(allItems[activeIndex]);
    }
  }

  /**
   * Keep keyboard focus inside the dialog while it is open. The result rows
   * are `tabIndex={-1}` (focus stays on the combobox and is tracked with
   * `aria-activedescendant`), so the only tab stops are the search field and
   * the ESC button.
   */
  function handleDialogKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;

    const target = nextTrapTarget(
      root,
      document.activeElement as HTMLElement | null,
      e.shiftKey ? "backward" : "forward",
    );
    if (target) {
      e.preventDefault();
      target.focus();
    }
  }

  if (!isOpen) {
    return (
      <button
        ref={triggerRef}
        onClick={open}
        aria-label={translateCopy("ui.open_global_search_489a247")}
        className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-elevated px-2 py-1.5 text-sm text-text-muted hover:border-border-hover hover:text-text-secondary transition-colors sm:px-3"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="4.5" />
          <path d="M10 10l3 3" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">{translateCopy("ui.search_bce0641")}</span>
        <kbd className="ml-1 hidden sm:inline-flex items-center gap-0.5 rounded border border-border-default px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          <span>⌘</span>{translateCopy("ui.k_a7ee38b")}
        </kbd>
      </button>
    );
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={translateCopy("ui.global_search_a2b8a16")}
      onKeyDown={handleDialogKeyDown}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-overlay backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-border-default bg-bg-card shadow-modal overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default">
          <svg className="w-4 h-4 flex-shrink-0 text-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10 10l3 3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-label={translateCopy("ui.search_trades_users_and_contract_3948f3a")}
            aria-controls="global-search-results"
            aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
            placeholder={translateCopy("ui.search_trades_users_contracts_204acaf")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyNavigation}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          {loading && (
            <svg className="w-4 h-4 animate-spin text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          )}
          <button
            onClick={close}
            aria-label={translateCopy("ui.close_search_0906f92")}
            className="rounded px-1.5 py-0.5 text-xs text-text-muted border border-border-default hover:border-border-hover transition-colors"
          >
            {translateCopy("ui.esc_1f7a4f9")}
          </button>
        </div>

        {/* Results */}
        <div id="global-search-results" className="max-h-[60vh] overflow-y-auto p-2" role="listbox" aria-label={translateCopy("ui.search_results_0144dae")}>
          {error && (
            <p className="px-3 py-4 text-center text-sm text-status-danger">{error}</p>
          )}

          {!error && query && !loading && !hasResults && (
            <p className="px-3 py-4 text-center text-sm text-text-muted">{translateCopy("ui.no_results_for_2a5f91d")}{query}&rdquo;</p>
          )}

          {!error && !query && (
            <p className="px-3 py-4 text-center text-sm text-text-muted">{translateCopy("ui.type_to_search_trades_users_and__6fdf7a0")}</p>
          )}

          {hasResults &&
            (Object.keys(CATEGORY_LABELS) as Array<keyof GroupedResults>).map((category) => {
              const items = results[category];
              if (items.length === 0) return null;

              const baseOffset =
                category === "trades"
                  ? 0
                  : category === "users"
                    ? results.trades.length
                    : results.trades.length + results.users.length;

              return (
                <div key={category} className="mb-1" role="group" aria-labelledby={`search-group-${category}`}>
                  <p id={`search-group-${category}`} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    {CATEGORY_LABELS[category]}
                  </p>
                  {items.map((item, idx) => {
                    const globalIdx = baseOffset + idx;
                    const isActive = activeIndex === globalIdx;
                    return (
                      <button
                        key={item.id}
                        id={`search-result-${globalIdx}`}
                        role="option"
                        tabIndex={-1}
                        aria-selected={isActive}
                        onClick={() => handleSelect({ ...item, category })}
                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                          isActive
                            ? "bg-bg-elevated text-text-primary"
                            : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                        }`}
                      >
                        <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
                        {item.subtitle && (
                          <span className="text-xs text-text-muted truncate max-w-[40%]">{item.subtitle}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
