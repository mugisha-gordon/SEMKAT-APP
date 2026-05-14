import Header from "@/components/layout/Header";
import { FileText, Scale, ShieldAlert, MessagesSquare, Ban, OctagonAlert, Handshake, Mail } from "lucide-react";

const Terms = () => {
  const termCards = [
    {
      title: "About Our Services",
      icon: FileText,
      text: "Semkat App connects users to real estate, land, construction, and related service opportunities provided by users and Semkat representatives.",
    },
    {
      title: "User Responsibilities",
      icon: Handshake,
      text: "Users must provide accurate information, protect account access, and avoid unlawful, abusive, or misleading behavior on the platform.",
    },
    {
      title: "Messaging & Interaction",
      icon: MessagesSquare,
      text: "Messaging tools are for legitimate communication. Spam, harassment, and harmful conduct are strictly prohibited.",
    },
    {
      title: "Content Rights",
      icon: Scale,
      text: "You retain ownership of your content, while granting Semkat permission to host and display it for app operation and service delivery.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12 md:py-16">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-10 mb-8">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-semkat-orange/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-semkat-sky/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground mb-3">
              <Scale className="h-3.5 w-3.5 text-semkat-orange" />
              Legal Agreement
            </div>
            <h1 className="font-heading text-3xl md:text-4xl text-foreground mb-3">Terms of Service</h1>
            <p className="max-w-3xl text-sm md:text-base text-muted-foreground leading-relaxed">
              By using the Semkat App, you agree to the terms below governing acceptable use, platform rules, and service limitations.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {termCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="rounded-2xl border border-border bg-card p-5 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-semkat-orange/15 text-semkat-orange flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-heading text-lg text-foreground">{card.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.text}</p>
              </article>
            );
          })}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-sm">
          <article className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2 text-foreground font-medium">
              <ShieldAlert className="h-4 w-4 text-semkat-sky" />
              Disclaimers
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Services are provided on an “as is” and “as available” basis. We cannot guarantee uninterrupted availability at all times.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2 text-foreground font-medium">
              <OctagonAlert className="h-4 w-4 text-semkat-sky" />
              Liability Limits
            </div>
            <p className="text-muted-foreground leading-relaxed">
              To the extent allowed by law, Semkat is not liable for indirect or consequential losses arising from platform use.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2 text-foreground font-medium">
              <Ban className="h-4 w-4 text-semkat-sky" />
              Suspension & Termination
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Accounts may be suspended or terminated for serious policy violations, abuse, or legal compliance requirements.
            </p>
          </article>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg text-foreground mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-semkat-orange" />
            Contact for Terms Questions
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For any questions regarding these Terms, contact{" "}
            <a className="text-foreground underline underline-offset-2" href="mailto:semkatgroupuganda@gmail.com">
              semkatgroupuganda@gmail.com
            </a>
            .
          </p>
        </section>

        <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/25 p-4 text-xs sm:text-sm text-muted-foreground">
          These Terms are presented in product-friendly format and should be reviewed by legal counsel before final publication.
        </div>
      </main>
    </div>
  );
};

export default Terms;

