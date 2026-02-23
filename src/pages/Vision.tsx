import SimplePageLayout from "@/components/SimplePageLayout";

export default function Vision() {
  return (
    <SimplePageLayout title="Vision">
      <div className="text-text-secondary space-y-4">
        <p>
          We envision a world where people can use AI on their most sensitive work without sending data to third parties. Privacy and capability should go together — you shouldn’t have to give up one to get the other.
        </p>
        <p>
          In that world, individuals can summarize a contract, explain a policy, or ask questions about a report without pasting it into a public chatbot. Companies can run AI on internal documents and customer data without shipping it to someone else’s cloud. The default is “your data stays with you”; sending it away is the exception, not the rule.
        </p>
        <p>
          We want private AI to be normal — not a premium or a niche. Free, in-browser tools like Doc Analyzer for everyday use; private servers and encrypted pipelines for organizations that need more. The technology exists; our job is to make it accessible, understandable, and practical so that more people and teams can benefit without compromising.
        </p>
        <p>
          Long term, we see a world where “AI that respects you” isn’t a slogan but an expectation. Where the question isn’t “Can we use AI and still protect our data?” but “How do we use it best?” We’re building toward that by shipping products and practices that put privacy first today.
        </p>
        <p>
          That’s the world we’re working toward: a little more clarity, a little more control, and a little more better — for everyone who wants it.
        </p>
      </div>
    </SimplePageLayout>
  );
}
