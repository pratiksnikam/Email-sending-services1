class MockEmailProvider {
    constructor(name, failureRate = 0.3) {
        this.name = name;
        this.failureRate = failureRate;
    }

    async send(email) {
        console.log(`Sending email via ${this.name}`);
        if (Math.random() < this.failureRate) {
            throw new Error(`${this.name} failed to send email.`);
        }
        console.log(`${this.name} successfully sent the email.`);
    }
}

class EmailService {
    constructor(providers, options = {}) {
        this.providers = providers;
        this.sentEmails = new Set();
        this.emailStatus = new Map();
        this.retryLimit = options.retryLimit || 1; // Attempt once before switching to the fallback provider
    }

    async sendWithProvider(provider, email) {
        await provider.send(email);
    }

    async sendEmail(email, idempotencyKey) {
        if (this.sentEmails.has(idempotencyKey)) {
            console.log('Email already sent, skipping.');
            return;
        }

        for (let attempt = 1; attempt <= this.retryLimit; attempt++) {
            for (const provider of this.providers) {
                try {
                    await this.sendWithProvider(provider, email);
                    this.sentEmails.add(idempotencyKey);
                    this.emailStatus.set(idempotencyKey, 'sent');
                    console.log('Email status: sent');
                    return;
                } catch (error) {
                    console.error(`Attempt ${attempt}: Failed with provider ${provider.name}. Error: ${error.message}`);
                }
            }
        }

        console.error('Failed to send email with all providers.');
        this.emailStatus.set(idempotencyKey, 'failed');
    }

    getStatus(idempotencyKey) {
        return this.emailStatus.get(idempotencyKey);
    }
}

// Example usage
const provider1 = new MockEmailProvider('Provider1', 0.5); // 50% chance to fail
const provider2 = new MockEmailProvider('Provider2', 0.1); // 10% chance to fail
const emailService = new EmailService([provider1, provider2]);

(async () => {
    const email1 = 'test@example.com';
    const idempotencyKey1 = 'unique-key-123';

    await emailService.sendEmail(email1, idempotencyKey1);
    console.log('Email status:', emailService.getStatus(idempotencyKey1));

    const email2 = 'test2@example.com';
    const idempotencyKey2 = 'unique-key-456';

    await emailService.sendEmail(email2, idempotencyKey2);
    console.log('Email status:', emailService.getStatus(idempotencyKey2));

    const email3 = 'test3@example.com';
    const idempotencyKey3 = 'unique-key-789';

    await emailService.sendEmail(email3, idempotencyKey3);
    console.log('Email status:', emailService.getStatus(idempotencyKey3));
})();
