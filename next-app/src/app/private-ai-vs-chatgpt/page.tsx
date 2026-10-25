import Link from "next/link";
import SimplePageLayout from "@/components/SimplePageLayout";
import { articleJsonLd, pageMetadata } from "@/seo";

export const metadata = pageMetadata("/private-ai-vs-chatgpt");

const articleLd = articleJsonLd(
  "/private-ai-vs-chatgpt",
  "Private AI vs ChatGPT: don’t paste contracts into a public chatbot",
);

export default function PrivateAiVsChatgptPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
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
                    Summarize and Ask on your device. Review, Extract, Compare,
                    and Timeline need Deep Analysis
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
            Standard mode is the default. On a desktop, Summarize and Ask run
            in the browser, and that document text is not sent to PIA. Review,
            Extract, Compare, and Timeline ask you to switch to Deep Analysis.
            Deep Analysis is on the waitlist. It is the optional stronger model,
            and it uses the providers listed in the{" "}
            <Link href="/trust-center" className="text-accent underline">
              Trust Center
            </Link>
            .{" "}
            <Link href="/pricing" className="text-accent underline">
              Private Mode is free
            </Link>
            . Deep Analysis is the paid plan.
          </p>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-text-primary tracking-tight">
              Is ChatGPT private enough for sensitive documents?
            </h2>
            <p>
              ChatGPT answers by sending your prompt to a service that runs the
              model. If you attach a file or paste a contract, that text is
              part of the request. The provider processes it on their side,
              applies whatever retention their product uses, and returns an
              answer. You do not hold the copy that was processed.
            </p>
            <p>
              That matters when the document is the sensitive part. A contract,
              a board paper, a client memo, or an unpublished draft is not the
              same as a general question about a public topic. Once the text
              has been submitted, your control is whatever the product&apos;s
              settings and contract allow after the fact. You can delete a chat
              in the interface. That is not the same as knowing every system
              that saw the file.
            </p>
            <p>
              Consumer ChatGPT and business or enterprise plans do not share
              one data policy. Some plans offer admin controls, retention
              choices, or a setting that turns training off. Others are aimed
              at personal use and assume a different default. The plan name on
              the invoice is the one that applies, not a blog post about a
              different tier. Read the current policy for the workspace you
              actually use before you upload a confidential file.
            </p>
            <p>
              People who would rather not make that bet choose local
              processing. The model runs where the file already is, so the
              analysis does not start with an upload. PIA Standard works that
              way on a desktop: you add the document, a small model runs in the
              browser, and the document text for that run is not uploaded to
              PIA. It is a weaker model than ChatGPT. The trade is capability
              for a shorter path. The file does not have to leave the browser
              to get a summary or an answer.
            </p>
            <p>
              Standard still needs a network connection to open the site and,
              the first time, to download that on-device model. The download is
              the model, not your document. Refreshing the page drops the
              working copy from the tab.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-text-primary tracking-tight">
              What happens when you upload a document to an AI chatbot?
            </h2>
            <p>
              A typical upload has four stages. First the browser sends the
              file, or the text you pasted, to the chatbot&apos;s service.
              Second, that service extracts what it needs and runs the model.
              Third, the service may keep the chat, the file, or logs for as
              long as its policy and your settings say. Fourth, you are left
              with those settings: training opt-outs, retention windows, admin
              policies, and delete buttons, each of which only covers what that
              vendor documents.
            </p>
            <p>
              None of those stages is automatically a breach. A hosted chatbot
              can be a reasonable place for a public spec or a draft you are
              happy to share with that vendor. The problem is using the same
              habit for a file you would not email to a stranger. Transmission
              and remote processing are the default, and retention is a policy
              question, not something you can see from the chat window.
            </p>
            <p>
              Local processing skips the upload. In PIA Standard the browser
              reads the file and the on-device model works on that text. Hosted
              processing, including ChatGPT and PIA Deep Analysis, sends the
              needed text to a server. Those are different products. Deep
              Analysis is not available as a general feature today. It is on
              the waitlist. For the steps to read a text-layer PDF in the
              browser, see{" "}
              <Link
                href="/ai-pdf-analyzer-without-uploading"
                className="text-accent underline"
              >
                how to analyze a PDF without uploading it
              </Link>
              .{" "}
              <Link href="/how-does-it-work" className="text-accent underline">
                How in-browser private analysis works
              </Link>{" "}
              walks through Summarize and Ask.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-text-primary tracking-tight">
              When should you use ChatGPT instead of PIA?
            </h2>
            <p>
              Use ChatGPT when the task is not a confidential document. It is a
              strong general assistant for conversation, brainstorming, writing,
              coding, and research. Those jobs want a large model and a chat
              interface. PIA does not try to be that.
            </p>
            <p>
              Use PIA when you already have a file and the file is the thing
              you do not want to paste. In Standard mode today you can
              Summarize it or Ask questions about it on a desktop. Document map,
              under More workflows, can list the structure of a longer file.
              Review, Extract, Compare, and Timeline are in the app, and
              choosing them in Standard asks you to switch to Deep Analysis.
              That mode is on the waitlist, so do not treat those workflows as
              available today.
            </p>
            <p>
              A practical split: draft a public blog post in ChatGPT, and run
              the client contract through PIA Standard. If you want a local
              chat app or a model you install yourself, that is a different
              choice. The{" "}
              <Link
                href="/private-chatgpt-alternatives"
                className="text-accent underline"
              >
                private ChatGPT alternatives
              </Link>{" "}
              guide compares those tools. This page stays with ChatGPT and PIA.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-text-primary tracking-tight">
              Local AI vs cloud AI: what&apos;s the difference?
            </h2>
            <p>
              Cloud AI, in this comparison, means ChatGPT. You send the prompt
              and any attachment. A large model answers from the provider&apos;s
              servers. Local AI, here, means PIA Standard. A small model runs
              in the desktop browser. The document text for that analysis is
              not uploaded to PIA.
            </p>
            <p>
              Cloud is the better fit when you need breadth: open questions,
              rewriting, code, or a long back-and-forth that is not tied to a
              secret file. Local is the better fit when the document itself is
              the constraint. You give up model strength. A small on-device
              model will miss nuance that ChatGPT would catch, and it can state
              something the file does not say. Check the result against the
              document either way.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <caption className="sr-only">
                  ChatGPT cloud processing compared with PIA Standard local processing
                </caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="py-3 pr-4 font-medium text-text-primary">
                      Question
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium text-text-primary">
                      ChatGPT
                    </th>
                    <th scope="col" className="py-3 font-medium text-text-primary">
                      PIA Standard
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border align-top">
                    <th scope="row" className="py-3 pr-4 font-medium text-text-primary">
                      Where the model runs
                    </th>
                    <td className="py-3 pr-4">On the provider&apos;s servers</td>
                    <td className="py-3">In a desktop browser</td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <th scope="row" className="py-3 pr-4 font-medium text-text-primary">
                      What you transmit
                    </th>
                    <td className="py-3 pr-4">
                      The prompt and any file or paste you submit
                    </td>
                    <td className="py-3">
                      Document text stays in the browser for the analysis. Opening
                      the site, and the first model download, still use the network
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <th scope="row" className="py-3 pr-4 font-medium text-text-primary">
                      Model strength
                    </th>
                    <td className="py-3 pr-4">A large general model</td>
                    <td className="py-3">
                      A small on-device model, suited to shorter document tasks
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <th scope="row" className="py-3 pr-4 font-medium text-text-primary">
                      Setup
                    </th>
                    <td className="py-3 pr-4">An account, plus that plan&apos;s data settings</td>
                    <td className="py-3">No account. Desktop browser</td>
                  </tr>
                  <tr className="align-top">
                    <th scope="row" className="py-3 pr-4 font-medium text-text-primary">
                      Better fit
                    </th>
                    <td className="py-3 pr-4">
                      Chat, drafting, coding, and research that is not a confidential file
                    </td>
                    <td className="py-3">
                      A document you do not want to send to a chatbot
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-text-primary tracking-tight">
              Who should consider private AI document analysis?
            </h2>
            <p>
              Consider it when pasting into ChatGPT is the step you keep
              hesitating over. The job is still to understand a document. The
              constraint is that the document should not be the prompt.
            </p>
            <p>
              Legal professionals run into this with drafts, client contracts,
              and notes that are not ready to leave the matter. A summary or a
              direct question in Standard mode is a reading aid. It is not legal
              advice, and it does not make a filing or a privilege review.
            </p>
            <p>
              Business owners hit the same wall with vendor agreements,
              employment drafts, and internal memos. ChatGPT is fine for a
              public-facing paragraph. The agreement itself is a better
              candidate for on-device Summarize or Ask, then a human read of
              the clauses that matter.
            </p>
            <p>
              Researchers often hold papers, data appendices, or unpublished
              notes they do not want in a consumer chat history. Standard mode
              can outline a text-layer file or answer a question about it.
              Verify quotations and numbers against the source. A small model
              will compress and sometimes invent.
            </p>
            <p>
              Financial and operations teams see the issue in board packs,
              invoices, and process docs. Use Standard mode to find the section
              worth reading. Do not treat the output as a figure you can book
              or report. PIA does not certify compliance with any regulation,
              and it does not replace an accountant, counsel, or reviewer.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl text-text-primary tracking-tight">
              Frequently asked questions
            </h2>

            <div className="space-y-2">
              <h3 className="font-display text-lg text-text-primary tracking-tight">
                Does ChatGPT train on uploaded documents?
              </h3>
              <p>
                It depends on the product, the plan, and the settings. Consumer
                ChatGPT and business or enterprise offerings do not all use the
                same training controls. Some accounts can turn training off.
                Some business terms say customer content is not used to train
                their models. Check the policy for the plan you use. Do not
                assume every upload is training data, and do not assume none of
                them are. PIA does not train on documents or prompts. In
                Standard mode the analysis runs in the browser.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-lg text-text-primary tracking-tight">
                Can I analyze a PDF without uploading it to a server?
              </h3>
              <p>
                Yes, for a PDF that already has a text layer, using PIA Standard
                on a desktop. The browser reads the text and the on-device model
                summarizes it or answers questions. Scanned pages are not read
                in Standard mode. The walkthrough is linked in the section on
                uploading a document to a chatbot.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-lg text-text-primary tracking-tight">
                Is local AI always more secure than cloud AI?
              </h3>
              <p>
                No. Local processing avoids sending that document to ChatGPT. It
                does not secure the computer. A lost laptop, a shared login, or
                malware still exposes the file. A small local model can also
                miss or invent details, which is an accuracy problem, not a
                privacy one. A cloud tool with a clear business contract can be
                the right place for work you are allowed to send. Local is the
                better fit when the document is what you do not want to transmit.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-lg text-text-primary tracking-tight">
                Is PIA a replacement for ChatGPT?
              </h3>
              <p>
                No. ChatGPT is the general assistant. PIA is for documents you
                already have. Keep ChatGPT for conversation, drafting, coding,
                and research that does not require a confidential file. Use PIA
                Standard when you want a summary or answers from that file
                without pasting it into the chatbot.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-lg text-text-primary tracking-tight">
                Can I choose between local and cloud analysis?
              </h3>
              <p>
                The app shows Standard and Deep Analysis. Standard is local, and
                it is what you can use now on a desktop, with no account. Deep
                Analysis is the server-side option. It is on the waitlist, so
                it is not a mode to rely on today. There is no second cloud
                switch that sends Standard runs to ChatGPT.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-text-primary tracking-tight">
              Try Standard mode on a document you would not paste
            </h2>
            <p>
              Open PIA on a desktop, add the file, and run Summarize or Ask.
              The first visit downloads a small model. The document stays in
              the browser for that analysis.
            </p>
            <Link
              href="/app"
              className="inline-flex items-center px-6 py-3 rounded-lg text-base font-medium bg-accent text-surface-0 hover:opacity-90 transition-opacity"
            >
              Analyze a document in Standard mode
            </Link>
          </section>
        </div>
      </SimplePageLayout>
    </>
  );
}
