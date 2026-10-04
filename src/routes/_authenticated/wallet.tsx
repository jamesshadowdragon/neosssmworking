import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Wallet,
  CreditCard,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  RefreshCw,
  XCircle,
  ExternalLink,
  Radio,
  ArrowRight,
} from "lucide-react";
import { DashboardShell, StatusBadge, EmptyState } from "@/components/dashboard/DashboardShell";
import {
  getAccountOverview,
  getWalletFunding,
  createAutoDetectDepositSession,
  checkAutoDepositStatus,
  cancelAutoDepositSession,
  createDepositRequest,
} from "@/lib/account.functions";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [{ title: "Wallet & Deposits — NeoSMM" }],
  }),
  component: WalletPage,
});

interface AutoDepositSession {
  deposit_id: string;
  request_number: number;
  base_amount: number;
  exact_amount: number;
  fiat_amount: number;
  fiat_currency: string;
  exchange_rate: number;
  tracking_ref: string;
  expires_at: string;
  destination: string | null;
  network: string | null;
  method_name: string;
  method_kind: string;
  instructions: string | null;
  qr_uri: string;
}

export function WalletPage() {
  const queryClient = useQueryClient();

  const fetchOverview = useServerFn(getAccountOverview);
  const { data: accountData } = useQuery({
    queryKey: ["account-overview"],
    queryFn: () => fetchOverview(),
    staleTime: 10_000,
  });

  const fetchWallet = useServerFn(getWalletFunding);
  const { data: walletData, isLoading: loadingWallet } = useQuery({
    queryKey: ["wallet-funding"],
    queryFn: () => fetchWallet(),
    staleTime: 10_000,
  });

  const startAutoSession = useServerFn(createAutoDetectDepositSession);
  const checkStatus = useServerFn(checkAutoDepositStatus);
  const cancelSession = useServerFn(cancelAutoDepositSession);

  const profile = accountData?.profile;
  const balance = Number(profile?.balance ?? 0);
  const transactions = accountData?.transactions ?? [];
  const roles = accountData?.roles ?? [];
  const isAdmin = roles.includes("admin");

  const methods = walletData?.methods ?? [];
  const deposits = walletData?.deposits ?? [];

  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [baseAmount, setBaseAmount] = useState<number>(25);
  const [activeSession, setActiveSession] = useState<AutoDepositSession | null>(null);
  const [txReference, setTxReference] = useState("");
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedDest, setCopiedDest] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState<{
    amount: number;
    balance: number;
    request_number: number;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("30:00");
  const [isExpired, setIsExpired] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    status: "approved" | "pending" | "rejected";
    message: string;
  } | null>(null);

  // Restore session from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("neosmm_active_auto_deposit");
      if (saved) {
        const parsed: AutoDepositSession = JSON.parse(saved);
        if (new Date(parsed.expires_at).getTime() > Date.now()) {
          setActiveSession(parsed);
        } else {
          localStorage.removeItem("neosmm_active_auto_deposit");
        }
      }
    } catch {}
  }, []);

  // Sync session to localStorage
  useEffect(() => {
    try {
      if (activeSession) {
        localStorage.setItem("neosmm_active_auto_deposit", JSON.stringify(activeSession));
      } else {
        localStorage.removeItem("neosmm_active_auto_deposit");
      }
    } catch {}
  }, [activeSession]);

  // Active selected method
  const activeMethod = useMemo(() => {
    if (selectedMethodId) {
      const found = methods.find((m) => m.id === selectedMethodId);
      if (found) return found;
    }
    return methods[0] ?? null;
  }, [methods, selectedMethodId]);

  // Countdown timer for active session
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      const end = new Date(activeSession.expires_at).getTime();
      const diff = end - Date.now();

      if (diff <= 0) {
        setTimeLeft("00:00");
        setIsExpired(true);
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
          `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Background automated polling for active session
  useEffect(() => {
    if (!activeSession || verifiedSuccess || isExpired) return;

    const poll = async () => {
      try {
        const res = await checkStatus({
          data: {
            deposit_id: activeSession.deposit_id,
            payment_reference: txReference.trim() || undefined,
            confirm_transfer: false,
          },
        });

        if (res?.verified && res?.status === "approved") {
          setVerifiedSuccess({
            amount: Number(res.amount ?? activeSession.exact_amount),
            balance: Number(res.balance ?? 0),
            request_number: activeSession.request_number,
          });
          setActiveSession(null);
          toast.success(
            `Payment of $${res.amount ?? activeSession.exact_amount} auto-detected & credited!`,
          );
          queryClient.invalidateQueries({ queryKey: ["wallet-funding"] });
          queryClient.invalidateQueries({ queryKey: ["account-overview"] });
        }
      } catch {}
    };

    const poller = setInterval(poll, 6000);
    return () => clearInterval(poller);
  }, [activeSession, verifiedSuccess, isExpired, txReference, checkStatus, queryClient]);

  // Copy helper
  function copyText(text: string, type: "amount" | "dest" | "ref") {
    navigator.clipboard.writeText(text);
    if (type === "amount") {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
      toast.success("Exact amount copied!");
    } else if (type === "dest") {
      setCopiedDest(true);
      setTimeout(() => setCopiedDest(false), 2000);
      toast.success("Destination address/UPI ID copied!");
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
      toast.success("Reference code copied!");
    }
  }

  // Generate unique exact amount session
  async function handleStartSession(e: React.FormEvent) {
    e.preventDefault();
    if (!activeMethod) {
      toast.error("Please select a payment method.");
      return;
    }

    if (
      baseAmount < Number(activeMethod.min_amount) ||
      baseAmount > Number(activeMethod.max_amount)
    ) {
      toast.error(
        `Amount must be between $${Number(activeMethod.min_amount)} and $${Number(activeMethod.max_amount)}`,
      );
      return;
    }

    setBusy(true);
    setIsExpired(false);
    setVerifiedSuccess(null);
    try {
      const session = await startAutoSession({
        data: {
          payment_method_id: activeMethod.id,
          base_amount: Number(baseAmount),
        },
      });

      setActiveSession(session as AutoDepositSession);
      toast.success(
        `Exact amount generated: $${session.exact_amount} (Unique fractional match active)`,
      );
      queryClient.invalidateQueries({ queryKey: ["wallet-funding"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize auto-detect deposit session.");
    } finally {
      setBusy(false);
    }
  }

  // Server-side manual verification check
  async function handleManualVerify() {
    if (!activeSession) return;
    const ref = txReference.trim();
    if (!ref) {
      toast.error(
        isUpi
          ? "Please paste your 12-digit UPI UTR number from your payment app (e.g. 428192837461)."
          : "Please paste your blockchain transaction hash (TxID) or signature.",
      );
      return;
    }

    setVerifying(true);
    setVerificationFeedback(null);
    try {
      const res = await checkStatus({
        data: {
          deposit_id: activeSession.deposit_id,
          payment_reference: ref,
          confirm_transfer: true,
        },
      });

      if (res?.verified && res?.status === "approved") {
        setVerifiedSuccess({
          amount: Number(res.amount ?? activeSession.exact_amount),
          balance: Number(res.balance ?? 0),
          request_number: activeSession.request_number,
        });
        setActiveSession(null);
        setVerificationFeedback(null);
        toast.success(
          res.message ||
            `Payment of $${res.amount ?? activeSession.exact_amount} auto-verified & credited!`,
        );
        queryClient.invalidateQueries({ queryKey: ["wallet-funding"] });
        queryClient.invalidateQueries({ queryKey: ["account-overview"] });
      } else if (res?.status === "rejected") {
        setVerificationFeedback({
          status: "rejected",
          message: res.message || "Payment verification failed. Please check the transaction hash.",
        });
        toast.error(res.message || "Payment verification rejected.");
      } else {
        setVerificationFeedback({
          status: "pending",
          message:
            res.message || "Scanning blockchain nodes and bank rail for incoming payment...",
        });
        toast.info(res.message || "Verification in progress.");
      }
    } catch (err: any) {
      const msg = err.message || "Payment detection error.";
      setVerificationFeedback({ status: "rejected", message: msg });
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  }

  // Cancel session
  async function handleCancelSession() {
    if (!activeSession) return;
    try {
      await cancelSession({ data: { deposit_id: activeSession.deposit_id } });
      setActiveSession(null);
      setIsExpired(false);
      setVerificationFeedback(null);
      toast.info("Deposit session cancelled. You can generate a new amount.");
      queryClient.invalidateQueries({ queryKey: ["wallet-funding"] });
    } catch {
      setActiveSession(null);
    }
  }

  const isUpi =
    activeSession?.fiat_currency === "INR" ||
    activeMethod?.kind === "upi" ||
    activeMethod?.code === "upi_pay";

  return (
    <DashboardShell
      title="Wallet & Deposits"
      description="Automated payment detection with unique exact amount verification for Cryptocurrency and UPI."
      isAdmin={isAdmin}
    >
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Balance Overview Banner */}
        <div className="panel aurora p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-primary/30">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Zap className="size-4 text-primary fill-primary/20" />
              <span>Instant Auto-Detection & Server Verification Active</span>
            </div>
            <p className="text-xs text-muted-foreground">Current Available Balance</p>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-foreground">
              {formatCurrency(balance)}
            </h2>
          </div>

          <div className="rounded-2xl bg-card/80 backdrop-blur-md p-4 border border-border space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">Auto-Verified Deposits:</span>
              <span className="font-bold text-emerald-500">
                {deposits.filter((d) => d.status === "approved").length}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">Pending Confirmations:</span>
              <span className="font-bold text-amber-500">
                {deposits.filter((d) => d.status === "pending").length}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Success Celebration Banner */}
        {verifiedSuccess && (
          <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 sm:p-8 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="size-16 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="size-10" />
              </div>
              <div className="space-y-1">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                  Payment Auto-Verified & Credited
                </span>
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Deposit #{verifiedSuccess.request_number} Completed!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your wallet has been credited with{" "}
                  <strong className="text-emerald-500">
                    +{formatCurrency(verifiedSuccess.amount)}
                  </strong>
                  . Available balance is now{" "}
                  <strong className="text-foreground">
                    {formatCurrency(verifiedSuccess.balance)}
                  </strong>
                  .
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3 justify-center sm:justify-start">
              <Link
                to="/new-order"
                className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-95 shadow-md shadow-primary/20"
              >
                <span>Create New Order</span>
                <ArrowRight className="size-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setVerifiedSuccess(null)}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        )}

        {/* Main Interface: Active Session Card vs Method Selection */}
        {activeSession ? (
          /* ACTIVE AUTO-DETECTION CHECKOUT CARD */
          <div className="panel p-6 sm:p-8 border-primary/40 shadow-xl space-y-8 animate-in fade-in">
            {/* Header with Live Status & Countdown */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <div className="relative flex size-10 items-center justify-center rounded-xl brand-gradient text-primary-foreground">
                  <Radio className="size-5 animate-pulse" />
                  <span className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500 border-2 border-background animate-ping" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl font-bold text-foreground">
                      Auto-Detection Active
                    </h3>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                      Live Network Listener
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deposit Request #{activeSession.request_number} &bull;{" "}
                    {activeSession.method_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-muted/60 border border-border px-4 py-2 rounded-2xl">
                <Clock className="size-4 text-primary animate-spin" />
                <div className="text-left">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Time Remaining
                  </span>
                  <span
                    className={`font-mono text-sm font-extrabold ${isExpired ? "text-destructive" : "text-primary"}`}
                  >
                    {isExpired ? "Session Expired" : timeLeft}
                  </span>
                </div>
              </div>
            </div>

            {/* EXACT AMOUNT CARD (HIGHLIGHTED) */}
            <div className="rounded-3xl border-2 border-primary/50 bg-primary/10 p-6 sm:p-8 text-center space-y-4 shadow-lg shadow-primary/5 relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  Exact Amount to Send (Do not round off)
                </span>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="font-display text-4xl sm:text-6xl font-extrabold text-foreground tracking-tight">
                    {activeSession.fiat_currency === "INR"
                      ? `₹${activeSession.fiat_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                      : `$${activeSession.exact_amount.toFixed(2)}`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        activeSession.fiat_currency === "INR"
                          ? activeSession.fiat_amount.toFixed(2)
                          : activeSession.exact_amount.toFixed(2),
                        "amount",
                      )
                    }
                    className="brand-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-95 shadow-md shadow-primary/20 transition-all active:scale-95"
                  >
                    {copiedAmount ? <Check className="size-4" /> : <Copy className="size-4" />}
                    <span>{copiedAmount ? "Copied!" : "Copy Exact Amount"}</span>
                  </button>
                </div>
                {activeSession.fiat_currency === "INR" && (
                  <p className="text-xs font-medium text-muted-foreground">
                    Equivalent to ${activeSession.exact_amount.toFixed(2)} USD &bull; Full{" "}
                    <strong>${activeSession.exact_amount.toFixed(2)}</strong> credited to your
                    balance upon payment.
                  </p>
                )}
              </div>

              {/* Crucial Explanatory Callout */}
              <div className="max-w-xl mx-auto rounded-2xl bg-card/80 border border-primary/30 p-3.5 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5 text-left">
                <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Why this specific exact amount?</strong>
                  <p className="mt-0.5">
                    The unique fractional amount (e.g.{" "}
                    <strong>
                      {activeSession.fiat_currency === "INR"
                        ? `₹${activeSession.fiat_amount.toFixed(2)}`
                        : `$${activeSession.exact_amount.toFixed(2)}`}
                    </strong>
                    ) identifies your transfer instantly on the network. When our server detects
                    this exact amount arriving, your account is credited immediately without waiting
                    for manual review!
                  </p>
                </div>
              </div>
            </div>

            {/* PAYMENT DESTINATION & QR CODE SECTION */}
            <div className="grid gap-6 md:grid-cols-12 items-center">
              {/* QR Code (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-muted/30 border border-border text-center space-y-3">
                <div className="bg-white p-3 rounded-2xl shadow-lg border border-border shrink-0">
                  {/* Dynamic QR code using safe public SVG QR API with fallback to static upi-qr */}
                  <img
                    src={
                      activeSession.qr_uri
                        ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=1&data=${encodeURIComponent(activeSession.qr_uri)}`
                        : "/upi-qr.png"
                    }
                    onError={(e) => {
                      // Fallback to local QR code image
                      (e.target as HTMLImageElement).src = "/upi-qr.png";
                    }}
                    alt="Payment QR Code"
                    className="size-48 object-contain rounded-xl"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground">
                    Scan with any {activeSession.method_name} app
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Amount is pre-filled automatically
                  </p>
                </div>
              </div>

              {/* Transfer Details & Addresses (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      {isUpi
                        ? "Receiver UPI ID (VPA)"
                        : `Deposit Address (${activeSession.network})`}
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-xl bg-card border border-border px-4 py-3 font-mono text-xs font-bold text-foreground select-all break-all">
                        {activeSession.destination || "yuval69goku@fam"}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(activeSession.destination || "yuval69goku@fam", "dest")
                        }
                        className="rounded-xl border border-border bg-card p-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                        title="Copy Destination"
                      >
                        {copiedDest ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isUpi && (
                    <div className="rounded-xl bg-card border border-border p-3 text-xs space-y-1">
                      <p>
                        <strong>Receiver Name:</strong> Yuval Mittal
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        Compatible with Google Pay, PhonePe, Paytm, FamPay, BHIM & all UPI apps.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Reference Code (Auto-Assigned)
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="rounded-xl bg-card border border-border px-3.5 py-2 font-mono text-xs font-semibold text-primary select-all">
                        {activeSession.tracking_ref}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyText(activeSession.tracking_ref, "ref")}
                        className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        {copiedRef ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Required Transaction Hash / UTR input */}
                <div className="pt-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>
                      {isUpi
                        ? "12-Digit UPI UTR / RRN (Required for Verification)"
                        : "Blockchain Transaction Hash / Signature (Required)"}
                    </span>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                      Verified On-Chain
                    </span>
                  </label>
                  <input
                    type="text"
                    value={txReference}
                    onChange={(e) => {
                      setTxReference(e.target.value);
                      if (verificationFeedback) setVerificationFeedback(null);
                    }}
                    placeholder={
                      isUpi
                        ? "Enter 12-digit UTR (e.g. 428192837461)"
                        : activeSession.method_kind === "crypto" &&
                            activeSession.network?.toLowerCase().includes("solana")
                          ? "Paste Solana signature (e.g. 5VERv8NM...)"
                          : "Paste transaction hash (e.g. 0x8f3c...)"
                    }
                    className="w-full rounded-xl border border-input bg-card py-2.5 px-4 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-0.5">
                    <span>
                      {isUpi
                        ? "Must match payment to yuval69goku@fam. Protected against duplicate claims."
                        : `Funds must be sent to ${activeSession.destination.slice(0, 6)}...${activeSession.destination.slice(-4)}.`}
                    </span>
                    {!isUpi && activeSession.network?.toLowerCase().includes("solana") && (
                      <a
                        href={`https://solscan.io/account/${activeSession.destination}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-semibold"
                      >
                        Check Solscan ↗
                      </a>
                    )}
                    {!isUpi && activeSession.network?.toLowerCase().includes("bnb") && (
                      <a
                        href={`https://bscscan.com/address/${activeSession.destination}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-semibold"
                      >
                        Check BscScan ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Live Verification Feedback Banner */}
                {verificationFeedback && (
                  <div
                    className={`rounded-xl p-3.5 text-xs flex items-start gap-2.5 border animate-in fade-in-50 ${
                      verificationFeedback.status === "rejected"
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : verificationFeedback.status === "approved"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                    }`}
                  >
                    {verificationFeedback.status === "rejected" ? (
                      <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    ) : verificationFeedback.status === "approved" ? (
                      <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                    ) : (
                      <Loader2 className="size-4 shrink-0 mt-0.5 animate-spin" />
                    )}
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        {verificationFeedback.status === "rejected"
                          ? "Verification Failed"
                          : verificationFeedback.status === "approved"
                            ? "Verification Complete"
                            : "Verification in Progress"}
                      </p>
                      <p className="opacity-90">{verificationFeedback.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* LIVE DETECTION RADAR & ACTION BUTTONS */}
            <div className="rounded-2xl border border-border bg-muted/40 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex size-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
                  </span>
                  <div className="text-xs">
                    <span className="font-bold text-foreground">Live Server Auto-Detection</span>
                    <p className="text-muted-foreground text-[11px]">
                      Scanning incoming network blocks every 5 seconds for transfer of exactly{" "}
                      <strong>
                        {activeSession.fiat_currency === "INR"
                          ? `₹${activeSession.fiat_amount.toFixed(2)}`
                          : `$${activeSession.exact_amount.toFixed(2)}`}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleManualVerify}
                    disabled={verifying || isExpired}
                    className="brand-gradient flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-primary-foreground hover:opacity-95 shadow-md shadow-primary/20 disabled:opacity-50"
                  >
                    {verifying ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    <span>{verifying ? "Verifying..." : "I Sent the Payment — Verify Now"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelSession}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 1: METHOD SELECTION & AMOUNT INPUT */
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Payment Method Selector Grid (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="panel p-6 sm:p-7 space-y-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    1. Select Deposit Method
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Each deposit generates a distinct exact amount for automated server detection.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {methods.map((method) => {
                    const isSelected = activeMethod?.id === method.id;
                    const methodIsUpi = method.kind === "upi" || method.code === "upi_pay";
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethodId(method.id)}
                        className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-display font-bold text-sm text-foreground">
                            {method.name}
                          </span>
                          {methodIsUpi ? (
                            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                              Instant UPI
                            </span>
                          ) : (
                            <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                              Crypto
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          Network: {method.network || "Direct"}
                        </span>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                          <span>Min: ${Number(method.min_amount)}</span>
                          <span className="text-primary font-semibold flex items-center gap-1">
                            <Zap className="size-3" /> Auto-Detect
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Method Summary Banner */}
                {activeMethod && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <ShieldCheck className="size-4" />
                      <span>
                        {activeMethod.name} &bull; Network: {activeMethod.network}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {activeMethod.instructions}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Base Amount Selector & Session Generator (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="panel p-6 sm:p-7 space-y-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    2. Choose Amount to Deposit
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter the desired base amount. A unique fractional amount will be calculated.
                  </p>
                </div>

                <form onSubmit={handleStartSession} className="space-y-5">
                  {/* Preset Pills */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-foreground">
                      Quick Pick (USD)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[10, 25, 50, 100, 250, 500].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setBaseAmount(val)}
                          className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                            baseAmount === val
                              ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          ${val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Amount Input */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Custom Deposit Amount ($ USD)
                    </label>
                    <div className="relative">
                      <span className="absolute top-1/2 left-3.5 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        required
                        min={activeMethod?.min_amount ?? 5}
                        max={activeMethod?.max_amount ?? 50000}
                        step="1"
                        value={baseAmount}
                        onChange={(e) => setBaseAmount(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-input bg-card py-2.5 pr-4 pl-8 text-sm font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
                      />
                    </div>
                    {activeMethod && (
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Allowed range: ${Number(activeMethod.min_amount)} &ndash; $
                        {Number(activeMethod.max_amount)} USD
                      </p>
                    )}
                  </div>

                  {/* Auto-detect info pill */}
                  <div className="rounded-xl bg-muted/60 p-3.5 text-xs text-muted-foreground space-y-1 border border-border/60">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                      <Zap className="size-3.5 text-amber-500" />
                      <span>How Auto-Detect Verification Works</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Clicking proceed will generate a unique exact amount (e.g. ${baseAmount}.17 or{" "}
                      {activeMethod?.kind === "upi"
                        ? `₹${Math.round(baseAmount * 89.5)}`
                        : `${baseAmount} USDT`}
                      ). Transferring that exact amount triggers automatic server verification and
                      instant crediting.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={busy || !activeMethod || baseAmount <= 0}
                    className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Zap className="size-4" />
                    )}
                    <span>Proceed to Auto-Detect Deposit</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Deposit History Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-foreground">Deposit Requests</h3>
            <span className="text-xs text-muted-foreground">Total {deposits.length} requests</span>
          </div>

          {deposits.length === 0 ? (
            <EmptyState
              title="No deposit requests yet"
              body="When you make a cryptocurrency or UPI deposit, automatic verification and credit status will appear here."
            />
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-3">Request #</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Reference / Code</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deposits.map((dep) => {
                    const isApproved = dep.status === "approved";
                    return (
                      <tr key={dep.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          #{dep.request_number}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {(dep as any).payment_methods?.name || "Deposit"}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-500 font-mono">
                          +{formatCurrency(Number(dep.amount))}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] font-mono text-muted-foreground truncate">
                          {dep.payment_reference}
                        </td>
                        <td className="px-4 py-3">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500">
                              <CheckCircle2 className="size-3" />
                              Auto-Verified
                            </span>
                          ) : (
                            <StatusBadge status={dep.status} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(dep.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transactions Ledger */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-bold text-foreground">Account Transactions</h3>

          {transactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              body="Order deductions, deposit credits, and refunds will be logged here in your ledger."
            />
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Balance After</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.slice(0, 15).map((tx) => {
                    const isCredit = Number(tx.amount) > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                              isCredit
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="size-3" />
                            ) : (
                              <ArrowUpRight className="size-3" />
                            )}
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium max-w-[280px] truncate">
                          {tx.description}
                        </td>
                        <td
                          className={`px-4 py-3 font-bold ${
                            isCredit ? "text-emerald-500" : "text-foreground"
                          }`}
                        >
                          {isCredit ? "+" : ""}
                          {formatCurrency(Number(tx.amount))}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {formatCurrency(Number(tx.balance_after))}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

export default WalletPage;
