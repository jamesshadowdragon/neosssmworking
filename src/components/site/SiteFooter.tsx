import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

const columns = [
  {
    title: "Platform",
    links: [
      { to: "/services", label: "Services" },
      { to: "/about", label: "About us" },
      { to: "/contact", label: "Contact" },
      { to: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/refund", label: "Refund Policy" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            NeoSMM is a managed social media marketing platform: order growth, content, advertising
            and analytics work from one dashboard and track every delivery.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="text-sm font-semibold text-foreground">Account</h3>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            </li>
            <li>
              <Link
                to="/auth"
                search={{ mode: "register" }}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Create account
              </Link>
            </li>
            <li>
              <Link
                to="/forgot-password"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Forgot password
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} NeoSMM. All rights reserved.</p>
          <p>Built for teams that treat social as a growth channel.</p>
        </div>
      </div>
    </footer>
  );
}
