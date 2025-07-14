
export const metadata = {
    title: 'Terms of Service | Asemi',
    description: 'Read the Terms of Service for Asemi.',
};

export default function TermsOfServicePage() {
    return (
        <div className="prose prose-lg max-w-none mx-auto text-foreground">
            <h1>Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <h2>1. Agreement to Terms</h2>
            <p>
                By using our services, you agree to be bound by these Terms. If you don’t agree to be bound by these Terms, do not use the services.
            </p>

            <h2>2. Privacy Policy</h2>
            <p>
                Please refer to our Privacy Policy for information on how we collect, use, and disclose information from our users. You acknowledge and agree that your use of the services is subject to our Privacy Policy.
            </p>

            <h2>3. Changes to Terms or Services</h2>
            <p>
                We may modify the Terms at any time, in our sole discretion. If we do so, we’ll let you know either by posting the modified Terms on the Site or through other communications. It’s important that you review the Terms whenever we modify them because if you continue to use the services after we have posted modified Terms on the Site, you are indicating to us that you agree to be bound by the modified Terms.
            </p>

            <h2>4. User Accounts</h2>
            <p>
                To use certain features of our services, you may be required to create an account. It's important that you provide us with accurate, complete and up-to-date information for your account and you agree to update such information, as needed, to keep it accurate, complete and up-to-date. If you don’t, we might have to suspend or terminate your account.
            </p>
            
            <h2>5. Content Ownership and Responsibility</h2>
            <p>
                All content provided on the platform, including courses and tools, is the property of Asemi or its content suppliers and protected by international copyright laws. You are granted a limited license to access and use the content for personal, non-commercial purposes.
            </p>

            <h2>6. Termination</h2>
            <p>
                We may terminate your access to and use of the services, at our sole discretion, at any time and without notice to you. You may cancel your account at any time by sending an email to us at <a href="mailto:hello.wdservices@gmail.com">hello.wdservices@gmail.com</a>.
            </p>

            <h2>7. Contact Information</h2>
            <p>
                If you have any questions about these Terms, please contact us at: <a href="mailto:hello.wdservices@gmail.com">hello.wdservices@gmail.com</a>.
            </p>
        </div>
    );
}
