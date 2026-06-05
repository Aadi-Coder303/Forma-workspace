import { Icons } from './ui/icons';

type LegalDocType = 'terms' | 'privacy' | 'data';

type LegalModalProps = {
  docType: LegalDocType;
  onClose: () => void;
};

const CONTENT = {
  terms: {
    title: 'Terms of Use',
    body: (
      <div className="space-y-4 text-sm text-primary leading-relaxed">
        <p><strong>1. Acceptance of Terms</strong><br/>By using the Forma Workspace application ("the App"), you agree to these Terms of Use. If you do not agree, please do not use the App.</p>
        <p><strong>2. License</strong><br/>We grant you a limited, non-exclusive, non-transferable license to use the App for your personal and commercial use on supported devices. The App is provided for managing your projects, invoices, and clients locally.</p>
        <p><strong>3. User Responsibilities</strong><br/>You are solely responsible for the data you enter into the App. Since all data is stored locally on your device, you are responsible for maintaining backups. We are not responsible for any data loss, corruption, or hardware failure on your end.</p>
        <p><strong>4. Local-First Architecture</strong><br/>The App operates entirely on your local machine. We do not host, sync, or transmit your project or client data to any external servers. Your data remains completely in your control.</p>
        <p><strong>5. Limitation of Liability</strong><br/>The App is provided "as is" without any warranties, express or implied. In no event shall Forma Digital or its developers be liable for any direct, indirect, incidental, special, or consequential damages arising out of the use or inability to use the App.</p>
        <p><strong>6. Modifications</strong><br/>We reserve the right to modify these Terms at any time. Continued use of the App following any changes indicates your acceptance of the new Terms.</p>
      </div>
    )
  },
  privacy: {
    title: 'Privacy Policy',
    body: (
      <div className="space-y-4 text-sm text-primary leading-relaxed">
        <p><strong>1. Introduction</strong><br/>At Forma Digital, we respect your privacy and are committed to protecting it. This Privacy Policy explains how data is handled within the Forma Workspace App.</p>
        <p><strong>2. Information Collection</strong><br/><strong>We do not collect any personal information.</strong> The Forma Workspace App is a local-first application. It does not send analytics, telemetry, crash reports, or user data to our servers or any third parties.</p>
        <p><strong>3. Data Storage</strong><br/>All information you input into the App—including client details, project files, invoices, and notes—is stored exclusively on your local device's hard drive within your chosen workspace directory.</p>
        <p><strong>4. Updates and Networking</strong><br/>The App requires internet access solely to check for software updates (via GitHub Releases). No personal data or usage metrics are transmitted during this process.</p>
        <p><strong>5. Third-Party Links</strong><br/>The App may contain links to our website (formadigital.in). Clicking these links will open your default web browser, and any interaction with our website is governed by the website's privacy policy, not this App's.</p>
        <p><strong>6. Changes to This Policy</strong><br/>Any future updates to this Privacy Policy will be reflected in new versions of the App. Because we do not collect your contact information, we cannot notify you of changes directly.</p>
      </div>
    )
  },
  data: {
    title: 'Data Compliance',
    body: (
      <div className="space-y-4 text-sm text-primary leading-relaxed">
        <p><strong>1. Complete Data Sovereignty</strong><br/>Forma Workspace is designed with privacy-by-default and local-first principles. You retain 100% ownership and control over all data generated and stored within the application.</p>
        <p><strong>2. No Cloud Synchronization</strong><br/>By default, the App does not sync your data to any cloud service. If you choose to store your workspace folder inside a third-party cloud synchronization folder (such as iCloud, Dropbox, or Google Drive), you are subject to the terms and privacy policies of those respective services.</p>
        <p><strong>3. GDPR and CCPA Compliance</strong><br/>Because Forma Workspace operates strictly locally and does not transmit, process, or store your data on external servers, the App itself is inherently compliant with the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA) regarding data collection.</p>
        <p><strong>4. Security</strong><br/>The security of your data depends entirely on the security of your local device. We recommend using strong passwords, enabling full-disk encryption (such as FileVault on macOS), and keeping your operating system up to date to protect your sensitive information.</p>
        <p><strong>5. Data Portability & Erasure</strong><br/>All App data is saved in plain JSON format within your specified workspace directory. You can easily view, backup, export, or permanently delete this data using standard file management tools on your computer. Uninstalling the App and deleting the workspace folder completely eradicates all associated data.</p>
      </div>
    )
  }
};

export default function LegalModal({ docType, onClose }: LegalModalProps) {
  const content = CONTENT[docType];

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-8 animate-fade-in backdrop-blur-sm">
      <div 
        className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[85vh] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-8 py-6 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="font-display text-2xl text-primary font-medium">{content.title}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-hover text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <Icons.Close size={18} />
          </button>
        </header>

        <div className="p-8 overflow-y-auto">
          {content.body}
        </div>
        
        <div className="px-8 py-6 border-t border-border flex justify-end shrink-0 bg-hover rounded-b-2xl">
          <button 
            onClick={onClose}
            className="bg-accent text-canvas px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
