import SimplePageLayout from "@/components/SimplePageLayout";

export default function About() {
  return (
    <SimplePageLayout title="About us">
      <div className="text-text-secondary space-y-4">
        <p>
          Doc Analyzer lets you understand documents using AI while keeping your data private. We believe everyone should be able to use AI on sensitive documents without sending them to the cloud.
        </p>
        <p>
          Add more about your team, story, and values here.
        </p>
      </div>
    </SimplePageLayout>
  );
}
