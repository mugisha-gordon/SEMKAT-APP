import Header from "@/components/layout/Header";
import { ShieldCheck, Database, Eye, Lock, SlidersHorizontal, Mail, Clock3 } from "lucide-react";

const Privacy = () => {
  const cards = [
    {
      title: "Information We Collect",
      icon: Database,
      points: [
        "Account details like name, email, and profile information.",
        "Messages, favorites, and in-app interactions.",
        "Property/video content and related metadata you upload.",
        "Basic usage signals that help improve app performance.",
      ],
    },
    {
      title: "How We Use Data",
      icon: Eye,
      points: [
        "Deliver app features such as listings, messaging, and alerts.",
        "Provide support and important account communication.",
        "Detect fraud, abuse, and misuse of the platform.",
        "Improve reliability, security, and overall user experience.",
      ],
    },
    {
      title: "Sharing & Disclosure",
      icon: ShieldCheck,
      points: [
        "Shared only with trusted providers needed to run the app.",
        "Never sold as personal data for third-party advertising.",
        "May be disclosed where required by law or safety reasons.",
      ],
    },
    {
      title: "Retention & Controls",
      icon: SlidersHorizontal,
      points: [
        "Data is kept only as long as necessary for operations and legal obligations.",
        "You can request updates, corrections, or deletion where applicable.",
        "Notification and preference controls are available in your account settings.",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12 md:py-16">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-10 mb-8">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-semkat-sky/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-semkat-orange/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-semkat-sky" />
              Privacy & Data Protection
            </div>
            <h1 className="font-heading text-3xl md:text-4xl text-foreground mb-3">Privacy Policy</h1>
            <p className="max-w-3xl text-sm md:text-base text-muted-foreground leading-relaxed">
              This policy explains how <span className="font-medium text-foreground">Semkat Group Uganda Ltd</span> collects, uses, and protects
              information when you use the Semkat App.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-border bg-card p-5 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-semkat-sky/15 text-semkat-sky flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-heading text-lg text-foreground">{item.title}</h2>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                  {item.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-semkat-orange shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-sm">
          <article className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2 text-foreground font-medium">
              <Lock className="h-4 w-4 text-semkat-orange" />
              Security
            </div>
            <p className="text-muted-foreground leading-relaxed">
              We apply reasonable technical and organizational safeguards to protect data, but no online system can guarantee absolute security.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2 text-foreground font-medium">
              <Clock3 className="h-4 w-4 text-semkat-orange" />
              Data Retention
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Information is retained only for as long as necessary for service delivery, legal compliance, and fraud-prevention obligations.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2 text-foreground font-medium">
              <Mail className="h-4 w-4 text-semkat-orange" />
              Contact
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Questions or requests can be sent to{" "}
              <a className="text-foreground underline underline-offset-2" href="mailto:semkatgroupuganda@gmail.com">
                semkatgroupuganda@gmail.com
              </a>
              .
            </p>
          </article>
        </section>

        <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/25 p-4 text-xs sm:text-sm text-muted-foreground">
          This policy is a product-facing draft and should be reviewed by legal counsel before final publication.
        </div>
      </main>
    </div>
  );
};

export default Privacy;

