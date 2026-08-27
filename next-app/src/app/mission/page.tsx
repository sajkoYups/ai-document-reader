import { pageMetadata } from "@/seo";
import SimplePageLayout from "@/components/SimplePageLayout";

export const metadata = pageMetadata("/mission");

export default function MissionPage() {
  return (
    <SimplePageLayout title="Mission">
      <div className="text-text-secondary space-y-4">
        <p>
          Our mission is to make private AI accessible to everyone. We want
          anyone who needs to use AI on sensitive documents to be able to do so
          without giving up privacy or control.
        </p>
        <p>
          We believe nobody should have to choose between understanding their
          documents and keeping them confidential. So we build tools that do
          both: PIA for individuals and small teams, and private AI
          servers for companies that need to run models on their own
          infrastructure. Same principle everywhere — your data stays yours.
        </p>
        <p>
          We keep the standard version of PIA free and plan to keep it
          that way. Our goal is for everyone who wants to use AI privately to be
          able to. That means no paywall for the basics: paste a doc, get a
          summary or a plain-language explanation, or chat with it, all in your
          browser. No account required; PIA does not store your document.
        </p>
        <p>
          For organizations, we help design and deploy private AI so that
          sensitive work never has to leave their environment. We advise on when
          to use in-browser tools, when to run your own models, and how to avoid
          the risks of sending confidential material to third-party APIs. We see
          that as part of the same mission: extending the option of private AI
          to as many people and teams as possible.
        </p>
        <p>
          We’re a team of creatives and tech, marketing, and data enthusiasts
          who want to help the world be a little better. This is how we’re doing
          it: one tool, one deployment, one choice at a time — always with
          privacy in mind.
        </p>
      </div>
    </SimplePageLayout>
  );
}
