import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, PageHeader, Prose } from "@/components/site/PublicShell";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy & Balance Protection — NeoSMM" },
      { name: "description", content: "Details on atomic refunds and balance protection on NeoSMM." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="Guarantee"
        title="Refund Policy & Balance Protection"
        description="NeoSMM provides transparent, automated refunds backed by database-level atomic guarantees."
      />

      <Prose>
        <h2>1. Atomic Order Refunds</h2>
        <p>
          If an order cannot be processed or is cancelled by our fulfillment network, 100% of the
          deducted funds are automatically refunded to your NeoSMM account balance immediately. You
          do not need to open a support ticket for automated cancellations.
        </p>

        <h2>2. Partial Deliveries</h2>
        <p>
          In scenarios where a service provider delivers a partial amount (e.g., 800 of 1,000 units),
          the remaining unfulfilled portion is calculated proportionally and automatically credited
          back to your balance.
        </p>

        <h2>3. Deposit Approvals & Credits</h2>
        <p>
          Deposits made via cryptocurrency (USDT BEP-20, BTC, SOL, LTC) or UPI are credited once the
          transaction reference is verified against network confirmations.
        </p>

        <h2>4. Non-Refundable Situations</h2>
        <p>
          Orders placed with incorrect or broken URLs (private profiles, deleted posts, misspelled
          links) that have already commenced fulfillment cannot be refunded once delivered. Please
          double-check all links before submitting orders.
        </p>
      </Prose>
    </PublicShell>
  );
}
