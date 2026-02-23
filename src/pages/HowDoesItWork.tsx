import SimplePageLayout from "@/components/SimplePageLayout";

export default function HowDoesItWork() {
  return (
    <SimplePageLayout title="How does it work">
      <div className="text-text-secondary space-y-4">
        <p>
          You add your document by pasting text or uploading a file. We support PDF, plain text, and Markdown. Once the document is in the app, it is processed locally in your browser so we can find the right parts to send to the AI — or, with Deep analysis (coming soon), we encrypt it and run the analysis on our side. Either way, you stay in control.
        </p>
        <p>
          You then choose what you want: <strong className="text-text-primary">Summarize</strong> gives you a short overview and key points; <strong className="text-text-primary">Explain</strong> rewrites the text in plain language so anyone can follow it; <strong className="text-text-primary">Chat</strong> lets you ask questions and get answers grounded in your document. The result appears in the app next to your doc. No account is required for the standard, in-browser version.
        </p>
        <p>
          In standard mode, the AI runs entirely in your browser. Your document never leaves your device. We use open models that load and run locally, so even the content we send to the model stays on your machine. That’s why it’s private: there’s no server logging your text or training on it.
        </p>
        <p>
          If you use an API or the future Deep analysis feature, we send your document (or an encrypted form of it) to a server to get a faster or more capable response. In those cases we still do not store or retain your document. We process it and return the answer; we don’t keep copies or use it for training. When you’re done, refreshing the page clears everything from the app.
        </p>
        <p>
          The app also builds a lightweight search index over your document so that for longer texts we can pull the most relevant passages into the AI’s context instead of sending the whole thing. That keeps responses focused and accurate without changing the privacy story: in standard mode that indexing happens in your browser too.
        </p>
        <p>
          In short: add a doc, pick summarize or explain or chat, get your result. Your data stays private, and when you close or refresh, it’s gone.
        </p>
      </div>
    </SimplePageLayout>
  );
}
