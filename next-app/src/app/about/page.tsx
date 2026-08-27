import { pageMetadata } from "@/seo";
import SimplePageLayout from "@/components/SimplePageLayout";

export const metadata = pageMetadata("/about");

export default function AboutPage() {
  return (
    <SimplePageLayout title="About us">
      <div className="text-text-secondary space-y-5">
        <p>
          We are <strong className="text-text-primary">Yups</strong>, a team of
          creatives who wanted a tool to help people understand documents in a
          private way. We built PIA so you can use AI on your docs
          without sending them to a public chatbot. In Standard mode the model
          runs in your browser. Deep Analysis uses our API and named providers.
        </p>
        <p>
          We are tech, marketing, and data enthusiasts who want to help the
          world be a little better.
        </p>
        <p>
          We believe everyone deserves to work with AI on the things that matter
          (contracts, reports, ideas) without having to choose between clarity
          and privacy. Good tools should respect you, not mine your data.
        </p>
        <p>
          PIA is our way of putting that belief into practice: a place
          where your documents stay yours, and understanding them gets a little
          easier.
        </p>
      </div>
    </SimplePageLayout>
  );
}
