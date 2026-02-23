import SimplePageLayout from "@/components/SimplePageLayout";

export default function WhoIsThisFor() {
  return (
    <SimplePageLayout title="Who is this for">
      <div className="text-text-secondary space-y-4">
        <p>
          Doc Analyzer is for anyone who needs to understand documents quickly and privately: contracts, reports, policies, or any text you don’t want to paste into a public AI tool.
        </p>
        <p>
          Add more about your target users, use cases, and personas here.
        </p>
      </div>
    </SimplePageLayout>
  );
}
