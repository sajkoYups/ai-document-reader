import Link from "next/link";
import SimplePageLayout from "@/components/SimplePageLayout";
import { pageMetadata } from "@/seo";

export const metadata = pageMetadata("/private-ai-vs-chatgpt");

export default function PrivateAiVsChatgptPage() {
  return (
    <SimplePageLayout title="Private AI vs ChatGPT: don’t paste contracts into a public chatbot">
      <div className="text-text-secondary space-y-8">
        <p>
          ChatGPT is a general assistant. PIA is document analysis that can
          stay on your device. If you currently paste contracts, policies, or
          unpublished drafts into a public chatbot, this page explains the
          difference.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <caption className="sr-only">
              Comparison of PIA and ChatGPT for private document analysis
            </caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-3 pr-4 font-medium text-text-primary">
                  Question
                </th>
                <th scope="col" className="py-3 pr-4 font-medium text-text-primary">
                  PIA Standard
                </th>
                <th scope="col" className="py-3 pr-4 font-medium text-text-primary">
                  PIA Deep Analysis
                </th>
                <th scope="col" className="py-3 font-medium text-text-primary">
                  Typical public chatbot
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border align-top">
                <th scope="row" className="py-3 pr-4 font-medium text-text-primary">
                  Where the file goes
                </th>
                <td className="py-3 pr-4">Stays in your browser</td>
                <td className="py-3 pr-4">
                  Encrypted to the PIA API, then sent over TLS to named
                  providers
                </td>
                <td className="py-3">Uploaded or pasted into a public service</td>
              </tr>
              <tr className="border-b border-border align-top">
                <th scope="row" className="py-3 pr-4 font-medium text-text-primary">
                  Training on your content
                </th>
                <td className="py-3 pr-4">No. Inference is local</td>
                <td className="py-3 pr-4">
                  PIA does not train on documents or prompts
                </td>
                <td className="py-3">Depends on the product and your settings</td>
              </tr>
              <tr className="border-b border-border align-top">
                <th scope="row" className="py-3 pr-4 font-medium text-text-primary">
                  Account required
                </th>
                <td className="py-3 pr-4">No</td>
                <td className="py-3 pr-4">Yes, for waitlist and paid plans</td>
                <td className="py-3">Usually yes</td>
              </tr>
              <tr className="align-top">
                <th scope="row" className="py-3 pr-4 font-medium text-text-primary">
                  Built for
                </th>
                <td className="py-3 pr-4">
                  Summarize, Review, Extract, Compare, Timeline, Ask
                </td>
                <td className="py-3 pr-4">
                  The same workflows with a stronger server-side model
                </td>
                <td className="py-3">General chat, not a document workflow</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Standard mode is the default: add a file, pick a workflow, get a
          result without sending the document to us. Deep Analysis is optional
          when you want a stronger model and accept the providers listed in the
          Trust Center.
        </p>

        <ul className="space-y-2">
          <li>
            <Link href="/how-does-it-work" className="text-accent underline">
              How in-browser private analysis works
            </Link>
          </li>
          <li>
            <Link href="/trust-center" className="text-accent underline">
              Trust Center: where data goes in each mode
            </Link>
          </li>
          <li>
            <Link href="/pricing" className="text-accent underline">
              Private Mode (€0) and Deep Analysis pricing
            </Link>
          </li>
        </ul>
      </div>
    </SimplePageLayout>
  );
}
