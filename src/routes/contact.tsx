import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, MessageSquare, Send, CheckCircle2, Loader2, PhoneCall } from "lucide-react";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";
import { submitContactMessage } from "@/lib/catalog.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Support — NeoSMM" },
      {
        name: "description",
        content:
          "Get in touch with the NeoSMM team for custom high-volume plans, API access, or support inquiries.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const submitMessage = useServerFn(submitContactMessage);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitMessage({ data: form });
      setSent(true);
      toast.success("Your message has been received. We will get back to you shortly!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-input bg-card py-2.5 px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40";

  return (
    <PublicShell>
      <PageHeader
        eyebrow="24/7 Support"
        title="We're Here to Help"
        description="Have questions regarding custom volume limits, API integrations, or billing? Reach out anytime."
      />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Info cards */}
          <div className="space-y-4">
            <div className="panel p-6 space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="size-5" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">Email Support</h3>
              <p className="text-xs text-muted-foreground">
                Direct inquiries and high-volume partnerships:
              </p>
              <a
                href="mailto:support@neosmm.site"
                className="text-xs font-semibold text-primary hover:underline block"
              >
                support@neosmm.site
              </a>
            </div>

            <div className="panel p-6 space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                <Send className="size-5" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">Telegram Channel</h3>
              <p className="text-xs text-muted-foreground">
                Instant priority updates and direct representative:
              </p>
              <span className="text-xs font-semibold text-sky-500">@NeoSMMSupport</span>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            <div className="panel p-8 sm:p-10">
              {sent ? (
                <div className="py-12 text-center space-y-4">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="size-7" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Message Sent!</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Thank you for reaching out. A support engineer will review your ticket and
                    respond to <strong>{form.email}</strong> within 12 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ name: "", email: "", subject: "", message: "" });
                      setSent(false);
                    }}
                    className="text-xs font-semibold text-primary hover:underline pt-2"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">
                        Your name
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Alex Rivers"
                        className={field}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">
                        Your email
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="alex@domain.com"
                        className={field}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Subject (optional)
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="High volume agency enquiry..."
                      className={field}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="How can we assist you?"
                      className={field}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    <span>Submit Message</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
