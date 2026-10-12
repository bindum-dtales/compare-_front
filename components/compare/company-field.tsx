"use client";

import { useId, useState } from "react";
import { Check, CircleAlert, CornerDownLeft, Globe, Search } from "lucide-react";
import { CompanyLogo } from "@/components/ui/company-logo";
import { editCompanyName, suggestCompanies } from "@/lib/research/library";
import type { ResearchInput, ResearchInputErrors } from "@/lib/research/validation";
import type { Company, CompanyResearch } from "@/lib/types";

/**
 * One side of the comparison: company name (a combobox suggesting researched companies from the
 * library) and website. Any valid name and website can be compared; the library only suggests. A
 * picked suggestion fills its own name and website together, and nothing is ever filled in without
 * a pick: typing a new name over a pick clears the website the pick filled, never one the user typed.
 */
export function CompanyField({
  label,
  value,
  onChange,
  errors,
  showErrors,
  valid,
  selected,
  domainOwner,
  library,
  excludeDomain,
  disabled,
}: {
  label: string;
  value: ResearchInput;
  onChange: (value: ResearchInput) => void;
  errors: ResearchInputErrors;
  /** Show every error (after a submit attempt), not only for fields the user has left. */
  showErrors: boolean;
  valid: boolean;
  /** The library company this input names (name and domain both match), if any. */
  selected: Company | null;
  /** A library company that has this website under another name: offered instead of a silent mismatch. */
  domainOwner: Company | null;
  library: CompanyResearch[];
  /** The other side's company, left out of the suggestions. */
  excludeDomain: string | null;
  disabled: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [touched, setTouched] = useState({ companyName: false, domain: false });
  /** What the last library pick (or "Use …") filled in. */
  const [picked, setPicked] = useState<ResearchInput | null>(null);
  const options = open && !disabled ? suggestCompanies(library, selected ? "" : value.companyName, excludeDomain) : [];
  const typed = value.companyName.trim();
  const showMenu = open && !disabled && (options.length > 0 || (!!typed && !selected && library.length > 0));
  const nameError = (showErrors || touched.companyName) && errors.companyName;
  const domainError = (showErrors || touched.domain) && errors.domain;
  const invalid = !!(nameError || domainError);
  const listId = `${id}-list`;

  function fill(c: Company) {
    const next = { companyName: c.name, domain: c.domain };
    setPicked(next);
    onChange(next);
  }

  function choose(c: CompanyResearch) {
    fill(c.company);
    setTouched({ companyName: true, domain: true });
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (options.length ? (i + step + options.length) % options.length : -1));
    } else if (e.key === "Enter" && options[active]) {
      e.preventDefault(); // pick the suggestion rather than submitting the form
      choose(options[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative min-w-0">
      <div className="flex h-5 items-center justify-between gap-2">
        <label htmlFor={`${id}-name`} className="eyebrow">
          {label}
        </label>
        {selected ? (
          <span className="flex animate-fade items-center gap-1 truncate text-[11.5px] font-semibold text-good">
            <Check className="size-3.5 shrink-0" strokeWidth={2.75} /> In your library
          </span>
        ) : (
          valid && !domainOwner && <span className="animate-fade truncate text-[11.5px] font-medium text-muted">New · will be researched</span>
        )}
      </div>

      <div className="relative mt-2">
        <div
          className={`rounded-[14px] border bg-surface transition-[border-color,box-shadow] duration-200 ${
            invalid
              ? "border-bad/50 focus-within:shadow-[0_0_0_3px_rgb(220_38_38_/_0.10)]"
              : selected
                ? "border-good/35 focus-within:border-accent-strong focus-within:shadow-[0_0_0_3px_rgb(37_99_235_/_0.14)]"
                : "border-line hover:border-line-strong focus-within:border-accent-strong focus-within:shadow-[0_0_0_3px_rgb(37_99_235_/_0.14)]"
          } ${disabled ? "opacity-70" : ""}`}
        >
          <div className="flex items-center gap-3 pl-3 pr-3.5">
            {selected ? (
              <CompanyLogo company={selected} size={34} />
            ) : (
              <span className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-canvas text-muted ring-1 ring-inset ring-line" aria-hidden>
                <Search className="size-[15px]" strokeWidth={2} />
              </span>
            )}
            <input
              id={`${id}-name`}
              role="combobox"
              aria-expanded={showMenu}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={options[active] ? `${id}-opt-${active}` : undefined}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? `${id}-name-error` : undefined}
              value={value.companyName}
              onChange={(e) => {
                onChange(editCompanyName(value, e.target.value, picked));
                setOpen(document.activeElement === e.target);
                setActive(-1);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                setOpen(false);
                if (typed) setTouched((t) => ({ ...t, companyName: true }));
              }}
              onKeyDown={onKeyDown}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
              placeholder="Search or enter a company"
              className="h-14 w-full min-w-0 bg-transparent text-[17px] font-semibold tracking-[-0.015em] text-ink outline-none placeholder:font-medium placeholder:text-faint"
            />
            {valid && !invalid && !domainOwner && (
              <span className="grid size-5 shrink-0 animate-fade place-items-center rounded-full bg-good text-white" role="img" aria-label="Ready to compare">
                <Check className="size-3" strokeWidth={3.25} />
              </span>
            )}
          </div>
          <div className="ml-[58px] mr-3.5 h-px bg-line" aria-hidden />
          <div className="flex items-center gap-3 pl-3 pr-3.5">
            <span className="grid w-[34px] shrink-0 place-items-center text-faint" aria-hidden>
              <Globe className="size-3.5" />
            </span>
            <label htmlFor={`${id}-domain`} className="sr-only">
              {label} website
            </label>
            <input
              id={`${id}-domain`}
              value={value.domain}
              onChange={(e) => onChange({ ...value, domain: e.target.value })}
              onBlur={() => value.domain && setTouched((t) => ({ ...t, domain: true }))}
              disabled={disabled}
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={!!domainError}
              aria-describedby={domainError ? `${id}-domain-error` : undefined}
              placeholder="website.com"
              className="h-10 w-full min-w-0 bg-transparent text-[13px] text-muted outline-none placeholder:text-faint focus:text-ink"
            />
          </div>
        </div>

        <div
          id={listId}
          role="listbox"
          aria-label={`Researched companies for ${label}`}
          className={showMenu ? "absolute inset-x-0 top-[calc(100%+6px)] z-30 animate-fade overflow-hidden rounded-[14px] border border-line bg-surface shadow-lift" : "hidden"}
        >
          {options.length > 0 ? (
            <>
              <p className="flex items-center justify-between px-3.5 pb-1.5 pt-3" role="presentation">
                <span className="eyebrow">Your library</span>
                <span className="hidden items-center gap-1 text-[11px] text-faint sm:flex">
                  ↑↓ <CornerDownLeft className="size-3" /> to select
                </span>
              </p>
              <div className="px-1.5 pb-1.5">
                {options.map((c, i) => (
                  <div
                    key={c.company.id}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()} // keep focus in the input so the click lands
                    onClick={() => choose(c)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2 transition-colors ${i === active ? "bg-canvas" : ""}`}
                  >
                    <CompanyLogo company={c.company} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">{c.company.name}</span>
                      <span className="block truncate text-[12px] text-muted">{c.company.domain}</span>
                    </span>
                    <span className="hidden max-w-[40%] truncate text-[11.5px] text-faint sm:block">{c.company.category}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="px-3.5 py-3 text-[12.5px] leading-relaxed text-muted" role="presentation">
              <span className="font-semibold text-ink">{typed}</span> isn&apos;t in your library yet. Add its website below and DTales will research it.
            </p>
          )}
        </div>
      </div>

      {domainOwner && !invalid && (
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-ink-2" role="status">
          <CircleAlert className="size-3.5 shrink-0 text-warn" />
          <span className="min-w-0">
            {domainOwner.domain} is <span className="font-semibold">{domainOwner.name}</span> in your library.
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fill(domainOwner)}
            className="font-semibold text-ink underline decoration-accent-strong decoration-2 underline-offset-4 hover:decoration-ink"
          >
            Use {domainOwner.name}
          </button>
        </p>
      )}

      {invalid && (
        <div className="mt-2 space-y-0.5 text-[12.5px] text-bad">
          {nameError && (
            <p id={`${id}-name-error`} className="flex items-start gap-1.5">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {errors.companyName}
            </p>
          )}
          {domainError && (
            <p id={`${id}-domain-error`} className="flex items-start gap-1.5">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {errors.domain}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
