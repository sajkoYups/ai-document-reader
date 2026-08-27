import SimplePageLayout from "@/components/SimplePageLayout";
import { PRIVACY_EMAIL, SECURITY_EMAIL } from "@/lib/securityContacts";
import { pageMetadata } from "@/seo";

export const metadata = pageMetadata("/trust-center");

export default function TrustCenterPage() {
  return (
    <SimplePageLayout title="Trust Center">
      <div className="text-text-secondary space-y-10">
        {/* 1. Trust Center Overview */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            1. Trust Center Overview
          </h2>
          <p>
            PIA is built for organizations that need to apply AI to
            sensitive documents while maintaining strict control over
            confidentiality, regulatory obligations, and internal security
            policies.
          </p>
          <p>
            Our security and privacy posture is guided by four core principles:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-text-primary">Privacy-first design</strong>
              . The system is architected so that document processing happens in
              the user&apos;s browser whenever technically feasible. Features
              are designed to avoid centralizing customer documents on our
              servers by default.
            </li>
            <li>
              <strong className="text-text-primary">Security by default</strong>
              . Secure defaults are prioritized over convenience. All network
              communication uses modern encryption, and infrastructure access is
              strongly controlled and audited.
            </li>
            <li>
              <strong className="text-text-primary">
                Minimal data retention
              </strong>
              . We do not maintain a persistent document database. While a
              session is open, document text is held in browser memory
              (including parsed sections and retrieval chunks) so analysis can
              run. That working copy is not encrypted at rest in the client. It
              is discarded when the page is refreshed, the tab is closed, idle
              timeout fires, or the session expires.
            </li>
            <li>
              <strong className="text-text-primary">
                Transparency with customers
              </strong>
              . We clearly describe how data flows through the system, what is
              and is not stored, which subprocessors are involved, and which
              controls are in place. We also share our roadmap toward formal
              certifications so that security, legal, and procurement teams can
              evaluate our posture.
            </li>
          </ul>
          <p>
            The platform is intended to allow secure AI-assisted document
            analysis while substantially reducing exposure to unnecessary data
            storage, centralized repositories, and third-party model training
            pipelines.
          </p>
        </section>

        {/* 2. Security Architecture */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            2. Security Architecture
          </h2>
          <p>
            The platform&apos;s security architecture assumes that documents may
            contain highly sensitive or regulated information such as contracts,
            financial statements, personal data, or confidential intellectual
            property. The primary design objective is to keep document content
            on the user&apos;s device when possible and to avoid persistent
            backend storage.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-text-primary">
                Client-side document processing
              </strong>
              . The application is delivered as a web client over HTTPS.
              Document ingestion (file selection or paste) is handled in the
              browser. Parsing, text extraction, and most pre-processing are
              executed locally using client-side JavaScript and, where
              applicable, WebAssembly. When supported by the user&apos;s device,
              certain AI models may run directly in the browser, avoiding the
              need to send document content over the network.
            </li>
            <li>
              <strong className="text-text-primary">
                Secure communication channels
              </strong>
              . Communication between the browser and backend APIs is performed
              exclusively over HTTPS with TLS (TLS 1.2+). API endpoints are
              authenticated where applicable and are rate-limited to reduce
              abuse. Hosting providers may also apply transport security such as
              HSTS.
            </li>
            <li>
              <strong className="text-text-primary">AI model interaction</strong>
              . When in-browser models are available, inference occurs locally
              and document content does not leave the user&apos;s device. When
              Deep Analysis (hosted AI) is used, the browser encrypts the
              request to our API; we decrypt it in memory only, forward the
              minimal necessary text over TLS to a privacy-constrained AI
              gateway (OpenRouter) or our optional self-hosted pods (RunPod),
              stream the result back, and discard transient data when the
              request completes. We do not store documents, prompts, or chat
              queries in our database. We configure OpenRouter with a provider
              allowlist and privacy routing flags (including{" "}
              <code className="text-text-primary">data_collection: deny</code>{" "}
              and Zero Data Retention where available) and do not build
              internal training datasets from customer documents. See{" "}
              <a href="#ai-subprocessors" className="text-accent underline">
                AI subprocessors
              </a>{" "}
              for named providers and their retention policies.
            </li>
            <li>
              <strong className="text-text-primary">
                Ephemeral session design
              </strong>
              . Both the web client and backend services are designed to treat
              analysis sessions as short-lived. Document content and derived
              context, such as extracted text or segmented chunks, are stored in
              browser memory in plaintext for the current session so run, chat,
              and retrieval stay synchronous. They are not encrypted in the
              client store. Backend components are stateless with respect to
              document content; any transient data needed for processing is held
              in memory and is discarded after completion of the request.
            </li>
          </ul>
          <p>
            By combining client-side processing, encrypted communication,
            limited AI payloads, and ephemeral session design, we reduce the
            amount of sensitive data available to any single system component
            and minimize the impact of potential compromise.
          </p>
        </section>

        {/* 3. Data Flow and Document Lifecycle */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            3. Data Flow and Document Lifecycle
          </h2>
          <p>
            This section describes how a typical document flows through PIA
            and clarifies where data is—and is not—stored.
          </p>
          <h3 className="text-lg font-semibold text-text-primary">
            3.1 High-level lifecycle
          </h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>User opens the application.</strong> The user accesses the
              web application over HTTPS, and the browser downloads the
              application assets (HTML, CSS, JavaScript).
            </li>
            <li>
              <strong>User provides a document.</strong> The user selects a
              local file or pastes text into the interface. The file or text is
              loaded directly into the browser&apos;s memory. By default, the
              full document is not uploaded to our servers.
            </li>
            <li>
              <strong>Local parsing and pre-processing.</strong> The browser
              extracts readable text and structure from the document, such as
              from PDF or DOCX formats. Pre-processing such as normalization,
              segmentation, or tokenization occurs client-side.
            </li>
            <li>
              <strong>AI interaction.</strong> If local or in-browser models are
              used, the model runs entirely within the browser context and the
              document content remains on the device. For Deep Analysis, the
              browser encrypts payloads to our backend (application-layer
              session keys); we decrypt in memory, forward the relevant text
              over TLS to the configured AI provider, and return the streamed
              result. We do not store original document content, prompts, or
              chat queries in our database. Inference providers process
              plaintext for the duration of the request under their published
              policies (see{" "}
              <a href="#ai-subprocessors" className="text-accent underline">
                AI subprocessors
              </a>
              ).
            </li>
            <li>
              <strong>Results presented to the user.</strong> The browser
              receives AI outputs and displays them to the user. The analysis
              context, such as question-answer history, is maintained in the
              browser&apos;s memory for as long as the session is active.
            </li>
            <li>
              <strong>Session termination.</strong> When the user refreshes the
              page, closes the tab, or navigates away, the in-memory session
              state is discarded by the browser. Backend services treat each
              request as independent and discard any transient processing data
              after the request completes or after a short time-to-live.
            </li>
          </ol>
          <h3 className="text-lg font-semibold text-text-primary">
            3.2 Storage and retention
          </h3>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Document content and prompts.</strong> There is no
              persistent document or prompt database. We do not store uploaded
              documents, analysis prompts, or chat queries in application
              storage. While you work, the open browser tab holds document text
              in memory; that copy is discarded on idle timeout, refresh, or
              close. Usage metering, when enabled, records only aggregate token
              estimates—not document or prompt text. Backend in-memory data used
              for a Deep Analysis request is discarded when the request
              completes.
            </li>
            <li>
              <strong>Application logs and telemetry.</strong> Logs focus on
              technical metadata such as timestamps, status codes, error
              messages, and request identifiers. Logging is configured to avoid
              capturing document content or other sensitive payload data. Log
              retention periods are defined to balance operational needs and
              data minimization.
            </li>
            <li>
              <strong>User accounts and configuration.</strong> If the platform
              uses accounts, limited account information such as email address,
              organization name, and settings may be stored in encrypted
              databases. This account data is logically separated from ephemeral
              analysis sessions and does not include document content unless a
              future feature explicitly requires and clearly discloses such
              storage.
            </li>
          </ul>
          <p>
            In summary, documents are processed in memory, not stored
            persistently, and are discarded when analysis completes or the user
            ends the session.
          </p>
        </section>

        {/* 4. Encryption and Data Protection */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            4. Encryption and Data Protection
          </h2>
          <p>
            Encryption is a core control for PIA, particularly because
            documents may include confidential and regulated information.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>HTTPS / TLS for all traffic.</strong> All communication
              between client and server uses HTTPS with TLS (TLS 1.2+). We use
              certificates from trusted Certificate Authorities and follow
              modern TLS configurations and cipher suites. Our cloud host may
              apply HTTP Strict Transport Security (HSTS); we do not currently
              set HSTS in application config.
            </li>
            <li>
              <strong>Secure client-server communication.</strong> Authentication
              tokens, session cookies, and API keys are transmitted only over
              TLS. Session cookies are configured with secure attributes such as
              Secure, HttpOnly, and, where appropriate, SameSite. APIs are
              designed with authentication and authorization checks aligned to
              user roles.
            </li>
            <li>
              <strong>Encrypted AI requests.</strong> Requests from the browser
              to our API use application-layer session encryption (ECDH +
              AES-256-GCM). This protects payloads from TLS-terminating proxies;
              PIA servers hold the session key and decrypt in memory. After
              decrypt, requests to hosted AI models (OpenRouter or optional
              self-hosted pods) are transmitted as plaintext over TLS-protected
              channels. Separate credentials are used for AI providers and are
              stored in dedicated secrets management systems. We avoid sending
              unnecessary identifiers in AI payloads and keep payloads scoped to
              the requested task.
            </li>
            <li>
              <strong>Data in transit protection.</strong> Network-level
              protections are layered on top of encryption, including
              restrictive firewall rules and, where applicable, private
              networking between services. Encryption in transit helps ensure
              that, even if traffic is intercepted, document content and
              credentials remain confidential.
            </li>
            <li>
              <strong>Data at rest (non-document data).</strong> Because we do
              not persist documents, at-rest encryption primarily protects user
              account and configuration data, operational logs and metrics
              (without document content), and credentials and keys in secrets
              management systems. These storage systems are encrypted at rest
              using the cloud provider&apos;s native mechanisms.
            </li>
          </ul>
          <p>
            Encryption safeguards both the document analysis workflow and the
            supporting operational data, significantly reducing the risk of
            unauthorized disclosure.
          </p>
        </section>

        {/* 5. Infrastructure Security */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            5. Infrastructure Security
          </h2>
          <p>
            The platform is hosted on a modern cloud provider that holds widely
            recognized security certifications such as SOC 2 and ISO 27001.
            While PIA itself has not yet undergone those audits, we
            inherit and build upon the provider&apos;s strong baseline.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Secure cloud hosting.</strong> Production workloads run in
              dedicated cloud accounts or projects with strict separation from
              development and test environments. Network segmentation and
              security groups limit inbound and outbound traffic to necessary
              ports and services. Administrative access paths, such as bastion
              hosts or VPNs, are tightly restricted and monitored.
            </li>
            <li>
              <strong>Restricted infrastructure access.</strong> Identity and
              Access Management (IAM) policies enforce least-privilege access to
              cloud resources. Only a small set of authorized engineers have
              access to production environments. Access rights are reviewed
              periodically and revoked when no longer needed.
            </li>
            <li>
              <strong>Multi-factor authentication (MFA).</strong> MFA is
              required for access to cloud consoles, CI/CD systems, and other
              critical administrative tools. Where possible, we favor
              phishing-resistant authentication mechanisms.
            </li>
            <li>
              <strong>Monitoring and logging.</strong> Centralized logging and
              monitoring provide visibility into system health and security
              events, including failed logins, unusual resource changes, and
              elevated error rates. Alerts are configured for security-relevant
              conditions so incidents can be detected and investigated promptly.
              Infrastructure changes are tracked through version control and
              CI/CD pipelines, providing an audit trail.
            </li>
            <li>
              <strong>Patch and vulnerability management.</strong> Base images,
              container images, and dependencies are regularly updated to
              incorporate security patches. Automated dependency scanning and
              vulnerability reporting tools are used to identify known issues,
              and high-severity findings are prioritized for remediation.
            </li>
            <li>
              <strong>Secrets management.</strong> Sensitive credentials such as
              API keys, database passwords, and AI provider keys are stored in
              managed secrets services. Access to secrets is limited to specific
              services via IAM roles and is auditable.
            </li>
          </ul>
        </section>

        {/* 6. Access Control and Operational Security */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            6. Access Control and Operational Security
          </h2>
          <p>
            Human access to systems is treated as a critical risk factor, and
            controls are in place to limit, monitor, and audit access.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Production access restrictions.</strong> Direct access to
              production systems is limited to a small group of engineers who
              require it to operate the service. Operational tasks such as
              deployments and configuration updates are performed primarily
              through automated CI/CD pipelines rather than manual changes.
              Access is reviewed on a regular cadence and adjusted based on role
              changes.
            </li>
            <li>
              <strong>Role-based access control (RBAC).</strong> Internal tools
              and administrative interfaces use RBAC to restrict actions based
              on functional responsibilities. Support and operations personnel
              are granted only the permissions required to fulfill their duties.
              Because documents are not centrally stored, routine access to
              customer document content by staff is structurally limited.
            </li>
            <li>
              <strong>Multi-factor authentication (MFA).</strong> MFA is
              enforced for administrative systems, including cloud accounts,
              code repositories, CI/CD platforms, and internal dashboards.
              Password policies and the use of password managers are encouraged
              and, where possible, enforced.
            </li>
            <li>
              <strong>Employee security practices.</strong> Employees receive
              guidance on secure handling of credentials, devices, and
              potentially sensitive information. Company-managed devices are
              expected to use full disk encryption and regular operating system
              and browser updates. Access to production data and systems is
              logged and auditable.
            </li>
            <li>
              <strong>Logging and monitoring of access.</strong> Administrative
              actions such as configuration changes and deployments are logged.
              IAM events and privilege changes are monitored for anomalies. On
              detection of suspicious activity, incident response procedures
              define escalation, containment, and remediation steps.
            </li>
          </ul>
        </section>

        {/* 7. Privacy Principles */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            7. Privacy Principles
          </h2>
          <p>
            Privacy is built into the architecture and design decisions of PIA,
            rather than considered only at the policy layer.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Privacy-by-design and by default.</strong> New features
              are evaluated for privacy impact during design and implementation.
              Default settings favor minimal data collection and local
              processing where feasible. We avoid building unnecessary data
              collection paths or broad logging of payloads.
            </li>
            <li>
              <strong>Minimal data collection.</strong> We collect only what is
              needed to operate and secure the service, such as account details,
              high-level usage metrics, and diagnostic information. Document
              content is not collected into centralized databases or used to
              build user profiles.
            </li>
            <li>
              <strong>No persistent document storage.</strong> By default, we do
              not store user documents or their full contents in application
              databases or long-term storage. Temporary processing data is
              scoped to single requests or short-lived sessions. If future
              features require optional document persistence, such as shared team
              workspaces or saved analyses, they will be clearly opt-in and
              documented with associated data handling.
            </li>
            <li>
              <strong>User control of their data.</strong> Users can end
              analysis sessions at any time by closing or refreshing the
              browser, which clears in-browser state. For account-related data
              such as name and email, we aim to support access, correction, and
              deletion requests in line with applicable regulations.
            </li>
            <li>
              <strong>Limited and governed third-party sharing.</strong> Sharing
              of data with subprocessors is limited to what is strictly
              necessary, such as infrastructure hosting or AI APIs. We publish
              the AI providers we use below and configure privacy routing
              (provider allowlist, no training / deny data collection, and Zero
              Data Retention where the endpoint supports it). Our zero
              persistence on PIA systems is distinct from short legal or abuse
              retention that a downstream provider may apply under its own
              policy.
            </li>
          </ul>
          <p>
            These principles ensure that confidential information is protected
            both through technical mechanisms and through organizational rules
            about how data is handled.
          </p>
        </section>

        {/* 8. AI Subprocessors */}
        <section id="ai-subprocessors" className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            8. AI Subprocessors
          </h2>
          <p>
            Deep Analysis may involve the following AI-related parties. PIA does
            not store your documents or prompts. Downstream providers process
            request content only to return an inference result; their published
            retention and training policies apply for the duration (and any
            short legal hold) described on their sites.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-text-primary">
                  <th className="py-2 pr-4 font-semibold">Party</th>
                  <th className="py-2 pr-4 font-semibold">Role</th>
                  <th className="py-2 pr-4 font-semibold">Privacy / retention</th>
                  <th className="py-2 font-semibold">More info</th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr className="border-b border-border/60">
                  <td className="py-3 pr-4 text-text-primary font-medium">
                    OpenRouter
                  </td>
                  <td className="py-3 pr-4">
                    LLM gateway and provider routing for Deep Analysis
                  </td>
                  <td className="py-3 pr-4">
                    Per-request privacy routing (provider allowlist,{" "}
                    <code className="text-text-primary">data_collection: deny</code>
                    , Zero Data Retention when available). OpenRouter does not
                    retain prompts unless prompt logging is explicitly opted in
                    on the account (we keep it disabled).
                  </td>
                  <td className="py-3">
                    <a
                      href="https://openrouter.ai/docs/guides/features/zdr"
                      className="text-accent underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      openrouter.ai — ZDR
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-3 pr-4 text-text-primary font-medium">
                    Microsoft Azure
                  </td>
                  <td className="py-3 pr-4">
                    Inference endpoint reachable via OpenRouter
                  </td>
                  <td className="py-3 pr-4">
                    Azure OpenAI data handling and no-training commitments as
                    published by Microsoft for the selected deployment.
                  </td>
                  <td className="py-3">
                    <a
                      href="https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/openai/data-privacy"
                      className="text-accent underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Azure OpenAI data privacy
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-3 pr-4 text-text-primary font-medium">
                    Novita AI
                  </td>
                  <td className="py-3 pr-4">
                    Inference endpoint reachable via OpenRouter
                  </td>
                  <td className="py-3 pr-4">
                    Selected for strong privacy posture (no model training on
                    customer prompts). Novita may retain prompts for a limited
                    period (on the order of ~30 days) for legal or abuse
                    compliance, then delete them—this is not long-term product
                    retention by PIA.
                  </td>
                  <td className="py-3">
                    <a
                      href="https://novita.ai/"
                      className="text-accent underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      novita.ai
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-3 pr-4 text-text-primary font-medium">
                    DeepInfra
                  </td>
                  <td className="py-3 pr-4">
                    Inference endpoint reachable via OpenRouter
                  </td>
                  <td className="py-3 pr-4">
                    Inference under DeepInfra&apos;s published data and privacy
                    terms; we route only when compatible with our OpenRouter
                    privacy settings.
                  </td>
                  <td className="py-3">
                    <a
                      href="https://deepinfra.com/docs/advanced/privacy_and_security"
                      className="text-accent underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      DeepInfra privacy &amp; security
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-3 pr-4 text-text-primary font-medium">
                    RunPod (optional)
                  </td>
                  <td className="py-3 pr-4">
                    Self-hosted vLLM pods when enabled as the Deep Analysis
                    provider
                  </td>
                  <td className="py-3 pr-4">
                    Content is processed on infrastructure we configure; not used
                    for model training. When pods are unavailable, Deep Analysis
                    may fall back to OpenRouter under the same privacy routing
                    rules.
                  </td>
                  <td className="py-3">
                    <a
                      href="https://www.runpod.io/"
                      className="text-accent underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      runpod.io
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-3 pr-4 text-text-primary font-medium">
                    Clerk
                  </td>
                  <td className="py-3 pr-4">Authentication and account identity</td>
                  <td className="py-3 pr-4">
                    Account identity only—not document or prompt content.
                  </td>
                  <td className="py-3">
                    <a
                      href="https://clerk.com/legal/privacy"
                      className="text-accent underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      clerk.com privacy
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Analytics tools, when enabled, are consent-gated via our cookie
            banner and do not receive document or prompt content. For the latest
            provider list or a vendor questionnaire, contact{" "}
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="text-accent underline"
            >
              {PRIVACY_EMAIL}
            </a>
            .
          </p>
        </section>

        {/* 9. AI Safety and Responsible AI */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            9. AI Safety and Responsible AI
          </h2>
          <p>
            Applying AI to documents introduces both opportunities and risks.
            Our approach to responsible AI focuses on safeguarding data,
            clarifying how models are used, and avoiding unnecessary reuse of
            customer content.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Responsible use of AI models.</strong> Models are used to
              assist users in understanding and analyzing documents, not to make
              unilateral decisions that affect rights or obligations without
              human oversight. We encourage customers to treat AI outputs as
              support for, not replacements of, professional judgment.
            </li>
            <li>
              <strong>Data protection during AI processing.</strong> Document
              content is processed only to fulfill user-initiated analysis
              requests. For remote AI models, payloads are limited to the
              minimal text and context needed to respond to the query. Where
              available, AI provider settings are configured to prevent the use
              of customer submissions for training or unrelated analytics.
            </li>
            <li>
              <strong>Transparency of AI interactions.</strong> We aim to
              clearly indicate where AI is involved in generating results and,
              at a high level, what types of models are used, such as local or
              hosted. Named AI subprocessors and retention notes are published
              in this Trust Center.
            </li>
            <li>
              <strong>No reuse of documents for training by default.</strong> We
              do not build internal training datasets from user documents
              without explicit, informed consent. We configure OpenRouter
              privacy routing so providers that may store or train on prompts
              are denied where those controls are available.
            </li>
            <li>
              <strong>Monitoring and improvement.</strong> The platform is
              monitored for misuse patterns, such as attempts to use the system
              for clearly abusive purposes, and we may take action aligned with
              terms of use. Feedback mechanisms allow users to report
              problematic outputs, which can be used to adjust prompts,
              configurations, or safeguards.
            </li>
          </ul>
        </section>

        {/* 10. Compliance Approach */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            10. Compliance Approach
          </h2>
          <p>
            Although PIA is an early-stage platform and has not yet
            completed formal audits such as SOC 2 or ISO 27001, its controls and
            processes are designed to align with recognized security and privacy
            principles.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Alignment with GDPR principles.</strong> We align with key
              GDPR concepts, including lawfulness, fairness, and transparency by
              clearly stating what data we collect, how it is used, and which
              subprocessors are involved. Purpose limitation ensures that data,
              including any document content processed, is used only to deliver
              and secure the service as requested by the user. Data minimization
              is achieved by avoiding persistent storage of document content and
              collecting only limited account and operational data. Storage
              limitation ensures operational data is retained only as long as
              necessary for security, support, and legal obligations. Integrity
              and confidentiality are supported through encryption, access
              control, and infrastructure security measures.
            </li>
            <li>
              <strong>General data protection best practices.</strong> PIA
              follows data protection best practices, including
              documented procedures for access control, incident handling, change
              management, and backup of critical configuration data. Secure
              development practices such as code review and dependency scanning
              are used, and vendor and subprocessor assessments focus on
              security certifications, data protection, and contractual
              safeguards.
            </li>
            <li>
              <strong>Effect of data minimization on compliance risk.</strong>{" "}
              By not maintaining a persistent store of user documents, we reduce
              the scope and impact of potential data breaches. Reduced data
              holdings simplify compliance with some regulatory requirements and
              limit long-term obligations associated with stored content.
            </li>
          </ul>
          <p>
            Our goal is to ensure that operational practices support regulatory
            compliance and can be readily mapped to formal frameworks as we
            progress to audited certifications.
          </p>
        </section>

        {/* 11. Compliance Roadmap */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            11. Compliance Roadmap
          </h2>
          <p>
            As the platform and customer base grow, we intend to obtain formal
            attestations and certifications that validate our security and
            privacy controls.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Short term.</strong> Formalize and document internal
              security and privacy policies, including access control and
              least-privilege standards, incident response and escalation
              procedures, and change management processes for infrastructure and
              application code. Maintain an up-to-date data inventory and data
              flow diagrams with emphasis on document analysis paths and
              third-party dependencies. Strengthen GDPR-aligned practices for
              account-level personal data, including subject access and
              deletion requests.
            </li>
            <li>
              <strong>Medium term.</strong> Engage an independent auditor to
              perform a SOC 2 Type I assessment focusing on security,
              availability, and confidentiality controls. Conduct regular
              independent penetration tests and security assessments and define
              processes for remediation of findings. Expand and document a
              vendor risk management program, including periodic review of
              subprocessors&apos; certifications and security practices.
            </li>
            <li>
              <strong>Long term.</strong> Achieve SOC 2 Type II attestation,
              demonstrating the operation of key controls over a defined
              observation period. Implement and certify an ISO 27001 information
              security management system covering core services and supporting
              infrastructure. Evaluate additional frameworks, such as AI-specific
              standards including ISO 42001, as they mature and become relevant
              to customer requirements.
            </li>
          </ul>
        </section>

        {/* 12. Vulnerability Disclosure */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            12. Vulnerability Disclosure
          </h2>
          <p>
            We operate a responsible vulnerability disclosure program and
            welcome contributions from security researchers and customers.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Responsible disclosure expectations.</strong> Researchers
              are asked to investigate and report vulnerabilities in a way that
              avoids privacy violations, service disruption, or data
              destruction. They should not attempt to access data that does not
              belong to them and should give us reasonable time to investigate
              and remediate before public disclosure.
            </li>
            <li>
              <strong>How to report a vulnerability.</strong> Security issues
              can be reported to{" "}
              <a
                href={`mailto:${SECURITY_EMAIL}`}
                className="text-accent underline"
              >
                {SECURITY_EMAIL}
              </a>{" "}
              with a detailed report including a clear description of the issue
              and potential impact, step-by-step reproduction instructions,
              affected components or endpoints, and contact details for
              coordinated follow-up.
            </li>
            <li>
              <strong>Handling of security reports.</strong> Reports are triaged
              and assigned a severity rating based on impact and exploitability.
              We acknowledge receipt of reports, investigate confirmed issues,
              prioritize remediation based on severity, and provide status
              updates where appropriate, particularly for high-impact issues.
              Once remediation is complete, we may update this Trust Center or
              other security documentation to reflect new controls or lessons
              learned.
            </li>
          </ul>
        </section>

        {/* 13. Security Contact */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            13. Security Contact
          </h2>
          <p>
            Organizations evaluating or using PIA can contact our
            security and privacy team for due diligence, risk assessments, and
            compliance questions.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Security and technical due diligence.</strong> For
              security questionnaires, vendor risk assessments, and detailed
              architecture or control descriptions, contact{" "}
              <a
                href={`mailto:${SECURITY_EMAIL}`}
                className="text-accent underline"
              >
                {SECURITY_EMAIL}
              </a>
              .
            </li>
            <li>
              <strong>Privacy and data protection inquiries.</strong> For Data
              Protection Agreements, GDPR-related questions, and data subject
              requests concerning account-level data, contact{" "}
              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="text-accent underline"
              >
                {PRIVACY_EMAIL}
              </a>
              .
            </li>
          </ul>
          <p>
            We encourage prospective and current customers to engage with us.
            Security and privacy are shared responsibilities, and we aim to
            provide the clarity needed for informed risk decisions and secure
            adoption of PIA.
          </p>
        </section>
      </div>
    </SimplePageLayout>
  );
}

