import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, PageHeader, Prose } from "@/components/site/PublicShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — NeoSMM" },
      { name: "description", content: "Terms of service and user agreements for NeoSMM." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="Legal Agreement"
        title="Terms of Service"
        description="Please read these terms carefully before utilizing the NeoSMM platform and automated services."
      />

      <Prose>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account, depositing funds, or submitting orders on NeoSMM, you agree to be
          bound by these Terms of Service. If you do not agree with any portion of these terms, you
          must discontinue use of the platform immediately.
        </p>

        <h2>2. Services & Fulfillment</h2>
        <p>
          NeoSMM provides automated promotional, marketing, and delivery services for social media
          accounts. We strive for maximum reliability and uptime. Delivery timelines are estimates
          based on network speed and provider throughput.
        </p>

        <h2>3. User Responsibilities & Account Security</h2>
        <p>
          You agree not to use the services for any prohibited, illegal, harassing, or fraudulent
          activities. You are solely responsible for maintaining the privacy and security of your
          account access credentials.
        </p>

        <h2>4. Payments & Balances</h2>
        <p>
          All deposits made via supported cryptocurrencies (USDT BEP-20, BTC, SOL, LTC) or UPI are
          credited to your on-platform balance upon transaction verification. Balances can be used to
          order any active service across the catalog.
        </p>

        <h2>5. Modifications</h2>
        <p>
          NeoSMM reserves the right to adjust service rates, platform features, and these terms at any
          time to maintain service quality and security standards.
        </p>
      </Prose>
    </PublicShell>
  );
}
