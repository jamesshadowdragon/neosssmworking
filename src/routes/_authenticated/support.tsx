import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  LifeBuoy,
  PlusCircle,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  User,
  Shield,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { DashboardShell, StatusBadge, EmptyState } from "@/components/dashboard/DashboardShell";
import {
  listSupportTickets,
  createSupportTicket,
  replyToSupportTicket,
  getAccountOverview,
} from "@/lib/account.functions";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [{ title: "Support Tickets — NeoSMM" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  const queryClient = useQueryClient();

  const fetchOverview = useServerFn(getAccountOverview);
  const { data: accountData } = useQuery({
    queryKey: ["account-overview"],
    queryFn: () => fetchOverview(),
    staleTime: 15_000,
  });

  const fetchTickets = useServerFn(listSupportTickets);
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => fetchTickets(),
    staleTime: 10_000,
  });

  const submitTicket = useServerFn(createSupportTicket);
  const sendReply = useServerFn(replyToSupportTicket);

  const roles = accountData?.roles ?? [];
  const isAdmin = roles.includes("admin");

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("order");
  const [newMessage, setNewMessage] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);

  const activeTicket = tickets.find((t) => t.id === activeTicketId);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    setBusy(true);
    try {
      const res = await submitTicket({
        data: {
          subject: newSubject.trim(),
          category: newCategory,
          message: newMessage.trim(),
        },
      });
      toast.success("Support ticket opened successfully!");
      setShowCreateModal(false);
      setNewSubject("");
      setNewMessage("");
      setActiveTicketId(res.ticketId);
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to create ticket.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTicketId || !replyBody.trim()) return;

    setBusy(true);
    try {
      await sendReply({
        data: {
          ticket_id: activeTicketId,
          body: replyBody.trim(),
        },
      });
      toast.success("Reply sent.");
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to send reply.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-input bg-card py-2.5 px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40";

  return (
    <DashboardShell
      title="Customer Support"
      description="Open a dedicated ticket or follow up on existing inquiries with our support team."
      isAdmin={isAdmin}
      actions={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <PlusCircle className="size-3.5" />
          <span>New Ticket</span>
        </button>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {activeTicket ? (
          /* Active Ticket Conversation View */
          <div className="panel p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTicketId(null)}
                  className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-foreground">
                      {activeTicket.subject}
                    </h2>
                    <StatusBadge status={activeTicket.status} />
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    Category: {activeTicket.category} • Created:{" "}
                    {formatDate(activeTicket.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Message Thread */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {(activeTicket as any).ticket_messages?.map((msg: any) => {
                const isStaff = msg.is_staff;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col rounded-2xl p-4 text-xs space-y-2 max-w-2xl ${
                      isStaff
                        ? "bg-primary/10 border border-primary/20 mr-auto"
                        : "bg-muted border border-border ml-auto"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 font-semibold">
                      <span className="flex items-center gap-1.5 text-foreground">
                        {isStaff ? (
                          <>
                            <Shield className="size-3.5 text-primary" />
                            <span className="text-primary font-bold">NeoSMM Staff</span>
                          </>
                        ) : (
                          <>
                            <User className="size-3.5 text-muted-foreground" />
                            <span>You</span>
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Box */}
            {activeTicket.status !== "closed" ? (
              <form onSubmit={handleSendReply} className="pt-4 border-t border-border space-y-3">
                <textarea
                  rows={3}
                  required
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your reply..."
                  className={field}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy || !replyBody.trim()}
                    className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    <span>Send Reply</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                This ticket is marked as closed. Open a new ticket if you require further assistance.
              </div>
            )}
          </div>
        ) : (
          /* Tickets List View */
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <EmptyState
                title="No support tickets"
                body="Need assistance with an order, API, or payment? Open a ticket with our team."
                action={
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    <PlusCircle className="size-3.5" />
                    <span>Create Ticket</span>
                  </button>
                }
              />
            ) : (
              <div className="panel divide-y divide-border">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTicketId(t.id)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-foreground">
                          {t.subject}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        Category: {t.category} • Created: {formatDate(t.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="text-xs font-medium">
                        {(t as any).ticket_messages?.length || 1} message(s)
                      </span>
                      <ChevronRight className="size-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Ticket Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="panel max-w-lg w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-display font-bold text-base text-foreground">
                  Open Support Ticket
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Subject / Summary
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Order #1042 delivery question"
                    className={field}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={field}
                  >
                    <option value="order">Order Fulfillment Inquiry</option>
                    <option value="payment">Deposit & Wallet Question</option>
                    <option value="api">API / Reseller Integration</option>
                    <option value="general">General Support</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Message Description
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Provide relevant order numbers or details..."
                    className={field}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    {busy && <Loader2 className="size-3.5 animate-spin" />}
                    <span>Submit Ticket</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
