import SimplePageLayout from "@/components/SimplePageLayout";

export default function HowDoesItWork() {
  return (
    <SimplePageLayout title="How does it work">
      <div className="text-text-secondary space-y-6">
        <p>
          You paste or upload a document (PDF, TXT, or Markdown). The app runs AI either in your browser so nothing leaves your device, or via an API with encryption for Deep analysis.
        </p>
        <p>
          You choose a task: summarize, explain in plain language, extract key points, draft from the doc, or chat with it. Results appear in the app. We don’t store or save your documents; when you refresh, everything is cleared.
        </p>
        <p>
          Add more technical or step-by-step detail here.
        </p>
      </div>
    </SimplePageLayout>
  );
}
