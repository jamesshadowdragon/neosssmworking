import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, PageHeader, Prose } from "@/components/site/PublicShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — NeoSMM" },
      { name: "description", content: "Privacy and data protection policy for NeoSMM users." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="Data Protection"
        title="Privacy Policy"
        description="How we collect, protect, and handle your information with the highest security standards."
      />

      <Prose>
        <h2>1. Information We Collect</h2>
        <p>
          We collect minimal information necessary to deliver services: your email address, basic
          profile identifiers, and public target links provided during order placement. We never ask
          for or store account passwords to your external social media accounts.
        </p>

        <h2>2. Use of Information</h2>
        <p>
          Your information is utilized solely to process transactions, dispatch orders to verified
          fulfillment providers, provide customer support, and communicate critical service updates.
        </p>

        <h2>3. Data Security & Encryption</h2>
        <p>
          We employ industry-standard encryption protocols (TLS/HTTPS) across all communications and
          secure Postgres database storage with role-based access control.
        </p>

        <h2>4. Third-Party Disclosures</h2>
        <p>
          NeoSMM does not sell, rent, or trade your personal information to third-party marketing
          firms. Information is only shared with backend fulfillment APIs strictly to execute your
          requested orders.
        </p>
      </Prose>
    </PublicShell>
  );
}
