"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FAQItem } from "@/data/faqData";

function FAQAccordion({
  item,
  isOpen,
  onClick,
}: {
  item: FAQItem;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-[var(--border)]">
      <button
        onClick={onClick}
        aria-expanded={isOpen}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg text-[var(--foreground)] group-hover:text-[var(--foreground-strong)] transition-colors pr-8">
          {item.question}
        </span>
        <div
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <ChevronDown
            className={`${isOpen ? "text-[var(--foreground-muted)]" : "text-[var(--foreground-muted)]"} transition-colors`}
            size={20}
          />
        </div>
      </button>

      <div
        className="grid transition-all duration-200"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="pb-6 text-[var(--foreground-secondary)] leading-relaxed">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQAccordionList({ faqs }: { faqs: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div
      className="opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
      style={{ animationDelay: "0.1s" }}
    >
      {faqs.map((faq, index) => (
        <FAQAccordion
          key={faq.question}
          item={faq}
          isOpen={openIndex === index}
          onClick={() => setOpenIndex(openIndex === index ? null : index)}
        />
      ))}
    </div>
  );
}
