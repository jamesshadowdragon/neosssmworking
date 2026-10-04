import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, HelpCircle, ArrowRight } from "lucide-react";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions — NeoSMM" },
      {
        name: "description",
        content:
          "Find answers to common questions about deposits, order delivery speed, atomic refunds, and supported platforms on NeoSMM.",
      },
    ],
  }),
  component: FaqPage,
});

const faqs = [
  {
    q: "How fast do orders start processing?",
    a: "Most services begin processing automatically within 1 to 10 minutes of submitting your order. You can monitor the real-time status directly on your Orders page in the dashboard.",
  },
  {
    q: "What payment methods are supported for adding funds?",
    a: "We support major cryptocurrencies including Tether USDT (BEP-20 / BNB Chain), Bitcoin (BTC), Solana (SOL), and Litecoin (LTC). In addition, we support direct instant UPI payments (Google Pay, PhonePe, Paytm, FamPay).",
  },
  {
    q: "How does the atomic refund guarantee work?",
    a: "If a service provider fails to fulfill your requested order or if an order is cancelled, our automated atomic ledger immediately returns 100% of the unfulfilled funds back to your platform balance without any manual ticket required.",
  },
  {
    q: "Are my social media credentials required to order?",
    a: "Never. We will never ask for your account password or sensitive login credentials. All we need is the public link or handle to the post, video, or profile you wish to promote.",
  },
  {
    q: "Can I place bulk or repeated orders?",
    a: "Yes! Our platform is built for high volume agencies and power users. You can place multiple orders concurrently, and our queue manager will handle them seamlessly.",
  },
  {
    q: "How do I upload payment proof for UPI or Crypto deposits?",
    a: "In your Wallet page, select your preferred payment method, send the funds to the provided destination address or UPI QR code, and paste your transaction hash or UPI UTR number along with a receipt screenshot. Our automated/admin team approves verified deposits promptly.",
  },
];

function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Help Center"
        title="Frequently Asked Questions"
        description="Everything you need to know about our services, ordering process, wallet funding, and platform reliability."
      />

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 space-y-6">
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="panel transition-colors hover:border-primary/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-foreground"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="size-4 text-primary shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`size-4 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-border px-5 py-4 text-xs leading-relaxed text-muted-foreground bg-muted/20 animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions? */}
        <div className="panel p-8 text-center space-y-3 mt-12 bg-surface/30">
          <h3 className="font-display text-lg font-bold text-foreground">Still have questions?</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Our support engineers are available 24/7 to assist you with custom requirements or order
            inquiries.
          </p>
          <div className="pt-2">
            <Link
              to="/contact"
              className="brand-gradient inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-semibold text-primary-foreground"
            >
              <span>Contact Support</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
