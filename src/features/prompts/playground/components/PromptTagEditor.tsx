import { Plus, Tag, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { cn } from "@/components/ui";

interface Props {
  tags: string[];
  /** Every tag already used in the library, offered as suggestions. */
  allTags: string[];
  onChange: (tags: string[]) => Promise<void> | void;
}

const clean = (raw: string): string => raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);

/** Tag chips for a prompt. Pick an existing tag, or type a new one and create it right here. */
export function PromptTagEditor({ tags, allTags, onChange }: Props): JSX.Element {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = clean(text);
  const suggestions = useMemo(
    () => allTags.filter((t) => !tags.includes(t) && (!value || t.includes(value))).slice(0, 6),
    [allTags, tags, value]
  );
  const exists = allTags.includes(value) || tags.includes(value);

  const save = async (next: string[]): Promise<void> => {
    setBusy(true);
    try {
      await onChange(next);
    } finally {
      setBusy(false);
    }
  };
  const add = async (tag: string): Promise<void> => {
    const t = clean(tag);
    if (!t || tags.includes(t)) return;
    setText("");
    await save([...tags, t]);
    inputRef.current?.focus();
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" data-testid="prompt-tags">
      <Tag aria-hidden className="text-slate-400" size={13} />
      {tags.map((t) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2 pr-1 text-[12px] font-medium text-slate-700" data-testid="prompt-tag" key={t}>
          {t}
          <button
            aria-label={`Remove tag ${t}`}
            className="grid h-4 w-4 place-items-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
            disabled={busy}
            onClick={() => void save(tags.filter((x) => x !== t))}
            type="button"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      {adding ? (
        <div className="relative">
          <input
            aria-label="Add a tag"
            autoFocus
            className="h-7 w-40 rounded-full border border-slate-300 bg-white px-2.5 text-[12px] text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            onBlur={() => window.setTimeout(() => { setAdding(false); setText(""); }, 150)}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                void add(value);
              } else if (e.key === "Escape") {
                setAdding(false);
                setText("");
              }
            }}
            placeholder="Add or create a tag"
            ref={inputRef}
            value={text}
          />
          {suggestions.length > 0 || (value && !exists) ? (
            <ul
              className="absolute left-0 top-8 z-20 m-0 w-56 list-none rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
              data-testid="tag-suggestions"
              role="listbox"
            >
              {suggestions.map((t) => (
                <li key={t}>
                  <button
                    className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] text-slate-800 hover:bg-slate-100"
                    onMouseDown={(e) => { e.preventDefault(); void add(t); }}
                    role="option"
                    type="button"
                  >
                    {t}
                  </button>
                </li>
              ))}
              {value && !exists ? (
                <li>
                  <button
                    className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-emerald-700 hover:bg-emerald-50")}
                    data-testid="create-tag"
                    onMouseDown={(e) => { e.preventDefault(); void add(value); }}
                    type="button"
                  >
                    <Plus size={13} /> Create tag “{value}”
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : (
        <button
          className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 text-[12px] text-slate-600 hover:border-slate-400 hover:text-slate-900"
          data-testid="add-tag"
          onClick={() => setAdding(true)}
          type="button"
        >
          <Plus size={12} /> {tags.length ? "Tag" : "Add tag"}
        </button>
      )}
    </div>
  );
}
