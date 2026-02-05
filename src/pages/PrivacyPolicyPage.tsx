import './LegalPages.css';

export function PrivacyPolicyPage() {
    return (
        <div className="legal-page">
            <a href="/" className="legal-back-button">← Back to Home</a>
            <div className="legal-container">
                <h1>Privacy Policy</h1>
                <p className="legal-last-updated">Last Updated: January 31, 2026</p>

                <section className="legal-section">
                    <h2>1. Introduction</h2>
                    <p>
                        ExoEngine ("we," "our," or "the Service") is committed to protecting your privacy. This Privacy Policy explains how
                        we handle your information when you use our Destiny 2 loadout management application.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>2. Information We Collect</h2>
                    <p>
                        <strong>ExoEngine is a client-side application.</strong> We do not operate servers that collect, store, or process your personal data.
                        All data handling occurs entirely within your web browser.
                    </p>
                    <h3>2.1 Bungie.net Authentication</h3>
                    <p>
                        When you authenticate with Bungie.net, we receive an OAuth 2.0 access token. This token:
                    </p>
                    <ul>
                        <li>Is stored locally in your browser using IndexedDB</li>
                        <li>Is used exclusively to make API requests to Bungie.net on your behalf</li>
                        <li>Is never transmitted to any server other than Bungie.net</li>
                        <li>Can be revoked at any time through your Bungie.net account settings</li>
                    </ul>

                    <h3>2.2 Local Storage</h3>
                    <p>
                        The following data is stored locally on your device using browser storage technologies (IndexedDB, LocalStorage):
                    </p>
                    <ul>
                        <li>Bungie.net authentication tokens</li>
                        <li>Your Destiny 2 character data (cached from Bungie API)</li>
                        <li>Saved loadouts and build configurations</li>
                        <li>Application settings and preferences</li>
                        <li>Destiny 2 game manifest data (item definitions, etc.)</li>
                    </ul>
                    <p>
                        <strong>This data never leaves your device</strong> except when sent directly to Bungie.net for game actions.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>3. How We Use Your Information</h2>
                    <p>
                        Your information is used solely to provide ExoEngine's functionality:
                    </p>
                    <ul>
                        <li>Authenticating with Bungie.net to access your Destiny 2 account</li>
                        <li>Displaying your characters, inventory, and equipment</li>
                        <li>Managing loadouts and transferring items between characters</li>
                        <li>Saving your custom builds and preferences locally</li>
                        <li>Applying subclass configurations and armor modifications</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>4. Data Sharing and Third Parties</h2>
                    <p>
                        <strong>We do not share, sell, rent, or trade your information with third parties.</strong>
                    </p>
                    <p>
                        ExoEngine only communicates with:
                    </p>
                    <ul>
                        <li><strong>Bungie.net:</strong> To authenticate your account and perform game actions via their official API</li>
                    </ul>
                    <p>
                        We do not use:
                    </p>
                    <ul>
                        <li>Analytics or tracking services</li>
                        <li>Advertising networks</li>
                        <li>Third-party cookies</li>
                        <li>Backend servers that collect user data</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>5. Data Security</h2>
                    <p>
                        We implement industry-standard security practices:
                    </p>
                    <ul>
                        <li><strong>OAuth 2.0 Authentication:</strong> Secure authorization flow through Bungie.net</li>
                        <li><strong>PKCE (Proof Key for Code Exchange):</strong> Enhanced security for the authorization process</li>
                        <li><strong>CSRF Protection:</strong> State tokens prevent cross-site request forgery attacks</li>
                        <li><strong>HTTPS Only:</strong> All communications are encrypted</li>
                        <li><strong>No Backend:</strong> Client-side architecture eliminates server-side breach risks</li>
                        <li><strong>Token Encryption:</strong> Sensitive tokens are stored securely in browser storage</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>6. Your Rights and Choices</h2>
                    <p>
                        You have complete control over your data:
                    </p>
                    <ul>
                        <li><strong>Access:</strong> All your data is stored locally on your device</li>
                        <li><strong>Deletion:</strong> Use Settings → Data & Cache → Reset All Data, or clear your browser data</li>
                        <li><strong>Revocation:</strong> Revoke ExoEngine's access through your Bungie.net account settings</li>
                        <li><strong>Export:</strong> Your data can be accessed through browser developer tools</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>7. Children's Privacy</h2>
                    <p>
                        ExoEngine is intended for users who meet Bungie's age requirements for Destiny 2. We do not knowingly collect
                        information from children under 13. If you believe a child has used ExoEngine, please contact us.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>8. International Users</h2>
                    <p>
                        ExoEngine is a client-side application accessible worldwide. Since all data is stored locally on your device,
                        no international data transfers occur to our servers (we don't have any). However, your authentication and
                        API requests are handled by Bungie.net according to their privacy policy.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>9. Changes to This Privacy Policy</h2>
                    <p>
                        We may update this Privacy Policy periodically. Changes will be posted on this page with an updated "Last Updated" date.
                        Your continued use of ExoEngine after changes constitutes acceptance of the revised policy.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>10. Contact Information</h2>
                    <p>
                        For privacy concerns or questions:
                    </p>
                    <ul>
                        <li><strong>GitHub:</strong> <a href="https://github.com/luckvj/ExoEngine" target="_blank" rel="noopener noreferrer">github.com/luckvj/ExoEngine</a></li>
                        <li><strong>Developer:</strong> Vj (@Unluckvj)</li>
                    </ul>
                    <p>
                        As an open-source project, you can review our entire codebase to verify our privacy practices.
                    </p>
                </section>

                <section className="legal-section legal-disclaimer">
                    <p>
                        <strong>Bungie Disclaimer:</strong> ExoEngine is not affiliated with, endorsed by, or supported by Bungie, Inc.
                        Destiny 2 and all related properties are trademarks and copyrights of Bungie, Inc.
                    </p>
                </section>
            </div>
        </div>
    );
}

export default PrivacyPolicyPage;
