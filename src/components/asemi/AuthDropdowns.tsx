import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check, Globe2, X } from "lucide-react";
import { SORTED_COUNTRIES, getCountryByCode, CountryInfo } from "@/lib/countries";
import { PRODUCT_CATEGORIES, IndustryCategory } from "@/lib/categories";

// ============================================================================
// SLEEK COUNTRY SELECT DROPDOWN
// ============================================================================
interface CountrySelectProps {
  selectedCode: string;
  onSelect: (code: string) => void;
  id?: string;
}

export const CountrySelectDropdown: React.FC<CountrySelectProps> = ({
  selectedCode,
  onSelect,
  id = "reg-country-select",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeCountry: CountryInfo = useMemo(() => {
    return getCountryByCode(selectedCode);
  }, [selectedCode]);

  // Filter countries by query (name, code, currency, currencySymbol)
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SORTED_COUNTRIES;
    return SORTED_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q) ||
        c.currencySymbol.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation: Escape closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Sleek Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs bg-[#fafaf9] hover:bg-white border rounded-lg transition-all text-left font-sans cursor-pointer ${
          isOpen
            ? "border-zinc-900 bg-white ring-2 ring-zinc-900/5 shadow-xs"
            : "border-zinc-200 hover:border-zinc-400"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Globe2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-sm shrink-0">{activeCountry.flag}</span>
          <span className="truncate font-medium text-zinc-900">{activeCountry.name}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
            {activeCountry.currency} ({activeCountry.currencySymbol}
            {activeCountry.ratePerCode}/tag)
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-zinc-800" : ""
            }`}
          />
        </div>
      </button>

      {/* Sleek Floating Popover Menu */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden font-sans flex flex-col"
          style={{ minWidth: "280px" }}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-zinc-100 bg-zinc-50/80 sticky top-0 z-10 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search country or currency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-0.5 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* List of Countries */}
          <div className="max-h-56 overflow-y-auto divide-y divide-zinc-50 py-1">
            {filteredCountries.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-400">
                No matching countries found
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = country.code === selectedCode;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      onSelect(country.code);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                      isSelected
                        ? "bg-zinc-100/90 text-zinc-950 font-semibold"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{country.flag}</span>
                      <span className="truncate">{country.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[11px] font-mono text-zinc-500">
                        {country.currency} ({country.currencySymbol})
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                        {country.currencySymbol}
                        {country.ratePerCode}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SLEEK INDUSTRY CATEGORY SELECT DROPDOWN
// ============================================================================
interface IndustrySelectProps {
  selectedId: string;
  onSelect: (id: string) => void;
  id?: string;
}

export const IndustrySelectDropdown: React.FC<IndustrySelectProps> = ({
  selectedId,
  onSelect,
  id = "reg-industry-category",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCategory = useMemo(() => {
    return PRODUCT_CATEGORIES.find((c) => c.id === selectedId) || PRODUCT_CATEGORIES[0];
  }, [selectedId]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation: Escape closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Sleek Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs bg-[#fafaf9] hover:bg-white border rounded-lg transition-all text-left font-sans cursor-pointer ${
          isOpen
            ? "border-zinc-900 bg-white ring-2 ring-zinc-900/5 shadow-xs"
            : "border-zinc-200 hover:border-zinc-400"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate font-medium text-zinc-900">{activeCategory.name}</span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-zinc-800" : ""
          }`}
        />
      </button>

      {/* Sleek Floating Popover Menu */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden font-sans flex flex-col"
          style={{ minWidth: "290px" }}
        >
          <div className="px-3 py-2 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Select manufacturing industry</span>
            <span className="font-mono text-[10px] text-zinc-400">12 categories</span>
          </div>

          {/* List of Categories */}
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50 py-1">
            {PRODUCT_CATEGORIES.map((cat: IndustryCategory) => {
              const isSelected = cat.id === selectedId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelect(cat.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-xs transition-colors text-left cursor-pointer ${
                    isSelected
                      ? "bg-zinc-100/90 text-zinc-950 font-semibold"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-900 truncate">{cat.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 shrink-0 ml-2" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-1 font-normal mt-0.5">
                      {cat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
