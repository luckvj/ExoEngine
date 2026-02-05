import './LegalPages.css';

export function TermsOfUsePage() {
    return (
        <div className="legal-page">
            <a href="/" className="legal-back-button">← Back to Home</a>
            <div className="legal-container">
                <h1>Terms of Use</h1>
                <p className="legal-last-updated">Last Updated: January 31, 2026</p>

                <section className="legal-section">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing, browsing, or using ExoEngine ("the Service," "we," "our"), you acknowledge that you have read,
                        understood, and agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree to these terms,
                        you must immediately discontinue use of the Service.
                    </p>
                    <p>
                        These terms constitute a legally binding agreement between you and ExoEngine. Your use of the Service is also
                        subject to Bungie's Terms of Service and API Terms of Use.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>2. Unofficial Third-Party Tool Disclaimer</h2>
                    <p>
                        <strong>IMPORTANT:</strong> ExoEngine is an <strong>unofficial, independent, community-created</strong> tool for
                        the video game Destiny 2. ExoEngine is:
                    </p>
                    <ul>
                        <li><strong>NOT</strong> created, owned, operated, or endorsed by Bungie, Inc.</li>
                        <li><strong>NOT</strong> affiliated with, sponsored by, or approved by Bungie, Inc.</li>
                        <li><strong>NOT</strong> an official Bungie product or service</li>
                        <li><strong>NOT</strong> supported by Bungie customer service</li>
                    </ul>
                    <p>
                        <strong>Bungie Trademarks:</strong> Destiny, Destiny 2, Bungie, and all associated logos, names, gameplay elements,
                        character races (including "Exo"), classes, locations, and other game content are trademarks, registered trademarks,
                        and/or copyrighted material of Bungie, Inc. All rights reserved by Bungie.
                    </p>
                    <p>
                        References to Destiny 2 and Bungie trademarks are made under the doctrine of <strong>nominative fair use</strong>
                        solely to identify and describe the game for which this tool is designed. No affiliation or endorsement is implied.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>3. ExoEngine Intellectual Property</h2>
                    <p>
                        <strong>ExoEngine™</strong> is a trademark claimed by the developer (Vj/@Unluckvj). The ExoEngine name, logo,
                        branding, original user interface designs, custom algorithms, and proprietary code are the intellectual property
                        of the developer and are protected by intellectual property laws.
                    </p>
                    <h3>3.1 Open Source License</h3>
                    <p>
                        ExoEngine's source code is made available as open source. While the code may be reviewed, modified, and contributed
                        to under the terms of the project's open source license, the ExoEngine trademark and brand identity remain protected.
                        Any forks or derivative works:
                    </p>
                    <ul>
                        <li>Must clearly indicate they are not the official ExoEngine</li>
                        <li>May not use the ExoEngine name or branding without permission</li>
                        <li>Must comply with the repository's license terms</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>4. Acceptable Use</h2>
                    <p>
                        You agree to use ExoEngine only for lawful purposes and in accordance with these Terms. You agree NOT to:
                    </p>
                    <ul>
                        <li>Use the Service to violate Bungie's Terms of Service or any applicable laws</li>
                        <li>Attempt to gain unauthorized access to Bungie systems or other users' accounts</li>
                        <li>Use the Service to cheat, exploit, or gain unfair advantages in Destiny 2</li>
                        <li>Reverse engineer, decompile, or attempt to extract source code (beyond what's provided as open source)</li>
                        <li>Use automated systems or bots to access the Service in ways that abuse the Bungie API</li>
                        <li>Redistribute, resell, or commercialize the Service without permission</li>
                        <li>Remove or modify any copyright, trademark, or proprietary notices</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>5. Use at Your Own Risk</h2>
                    <p>
                        ExoEngine provides loadout management, inventory optimization, and item transfer functionality using Bungie's
                        official API. While we implement safety measures and follow best practices (including DIM-inspired transfer logic),
                        <strong>you use this tool entirely at your own risk.</strong>
                    </p>
                    <h3>5.1 No Warranty</h3>
                    <p>
                        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
                        BUT NOT LIMITED TO:
                    </p>
                    <ul>
                        <li>Warranties of merchantability or fitness for a particular purpose</li>
                        <li>Warranties that the Service will be uninterrupted, error-free, or secure</li>
                        <li>Warranties regarding the accuracy or reliability of any information or content</li>
                        <li>Warranties that defects will be corrected or that the Service is free of viruses or harmful components</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>6. Limitation of Liability</h2>
                    <p>
                        TO THE MAXIMUM EXTENT PERMITTED BY LAW, EXOENGINE, ITS DEVELOPER, CONTRIBUTORS, AND AFFILIATES SHALL NOT BE
                        LIABLE FOR ANY:
                    </p>
                    <ul>
                        <li>Direct, indirect, incidental, special, consequential, or punitive damages</li>
                        <li>Loss of data, items, characters, accounts, or game progress</li>
                        <li>Loss of profits, revenue, or business opportunities</li>
                        <li>Service interruptions, API errors, or Bungie.net downtime</li>
                        <li>Bugs, glitches, or errors in the Service</li>
                        <li>Account suspensions or bans resulting from use of third-party tools</li>
                        <li>Any damages arising from your use or inability to use the Service</li>
                    </ul>
                    <p>
                        This limitation applies even if we have been advised of the possibility of such damages. Some jurisdictions do not
                        allow the exclusion or limitation of certain warranties or liabilities, so the above limitations may not apply to you.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>7. Indemnification</h2>
                    <p>
                        You agree to indemnify, defend, and hold harmless ExoEngine, its developer, contributors, and affiliates from any
                        claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising from:
                    </p>
                    <ul>
                        <li>Your use or misuse of the Service</li>
                        <li>Your violation of these Terms or any applicable laws</li>
                        <li>Your violation of any third-party rights, including Bungie's intellectual property</li>
                        <li>Any actions taken by Bungie against your account</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>8. Third-Party Services and APIs</h2>
                    <p>
                        ExoEngine relies on Bungie's API to function. Your use of the Service is subject to:
                    </p>
                    <ul>
                        <li><strong>Bungie's Terms of Service:</strong> Available at bungie.net</li>
                        <li><strong>Bungie's API Terms:</strong> Available on Bungie's developer portal</li>
                        <li><strong>Bungie's Privacy Policy:</strong> Governs how Bungie handles your data</li>
                    </ul>
                    <p>
                        We are not responsible for any changes, interruptions, or termination of Bungie's API services. Bungie may revoke
                        API access at any time, which would prevent ExoEngine from functioning.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>9. Account Security</h2>
                    <p>
                        You are responsible for:
                    </p>
                    <ul>
                        <li>Maintaining the confidentiality of your Bungie.net account credentials</li>
                        <li>All activities that occur under your account when using ExoEngine</li>
                        <li>Logging out when finished using the Service on shared devices</li>
                        <li>Notifying us immediately of any unauthorized use of your account</li>
                    </ul>
                    <p>
                        We store your authentication tokens locally on your device. You can revoke ExoEngine's access to your Bungie
                        account at any time through your Bungie.net account settings.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>10. Modifications to the Service</h2>
                    <p>
                        We reserve the right to:
                    </p>
                    <ul>
                        <li>Modify, suspend, or discontinue the Service at any time without notice</li>
                        <li>Update features, functionality, or user interface</li>
                        <li>Impose limits on certain features or restrict access to parts of the Service</li>
                    </ul>
                    <p>
                        We are not liable for any modification, suspension, or discontinuation of the Service.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>11. Changes to Terms</h2>
                    <p>
                        We may revise these Terms at any time. Changes will be effective immediately upon posting to this page with an
                        updated "Last Updated" date. Your continued use of the Service after changes are posted constitutes your acceptance
                        of the revised Terms.
                    </p>
                    <p>
                        Material changes may be announced through the application or our GitHub repository. We encourage you to review
                        these Terms periodically.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>12. Termination</h2>
                    <p>
                        You may stop using the Service at any time. To fully terminate your use:
                    </p>
                    <ul>
                        <li>Revoke ExoEngine's API access through your Bungie.net account settings</li>
                        <li>Clear your browser's local storage and IndexedDB data</li>
                    </ul>
                    <p>
                        We reserve the right to terminate or restrict your access to the Service if you violate these Terms, though as a
                        client-side application, enforcement is primarily handled through Bungie's API access controls.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>13. Dispute Resolution and Governing Law</h2>
                    <p>
                        These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these
                        Terms or your use of the Service shall be resolved through good faith negotiation.
                    </p>
                    <p>
                        As an open-source community project, we encourage resolving issues through our GitHub repository's issue tracker.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>14. Severability</h2>
                    <p>
                        If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in
                        full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid
                        and enforceable.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>15. Entire Agreement</h2>
                    <p>
                        These Terms, together with our Privacy Policy, constitute the entire agreement between you and ExoEngine regarding
                        the use of the Service and supersede all prior agreements and understandings.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>16. Contact Information</h2>
                    <p>
                        For questions about these Terms:
                    </p>
                    <ul>
                        <li><strong>GitHub:</strong> <a href="https://github.com/luckvj/ExoEngine" target="_blank" rel="noopener noreferrer">github.com/luckvj/ExoEngine</a></li>
                        <li><strong>Developer:</strong> Vj (@Unluckvj)</li>
                        <li><strong>Website:</strong> <a href="https://unluckvj.xyz/" target="_blank" rel="noopener noreferrer">unluckvj.xyz</a></li>
                    </ul>
                </section>

                <section className="legal-section legal-disclaimer">
                    <p>
                        <strong>FINAL DISCLAIMER:</strong> ExoEngine is not affiliated with, endorsed by, or supported by Bungie, Inc.
                        Destiny, Destiny 2, Bungie, and all related properties are trademarks and copyrights of Bungie, Inc. Use of
                        these trademarks does not imply any affiliation with or endorsement by Bungie. ExoEngine is an independent
                        fan-made tool created to enhance the Destiny 2 experience.
                    </p>
                </section>
            </div>
        </div>
    );
}

export default TermsOfUsePage;
