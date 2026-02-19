import asyncio
import sys
import os

# Add backend directory to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.services.email_service import EmailService
from app.core.config import settings

async def main():
    print(f"Testing Email Service...")
    print(f"SMTP Host: {settings.SMTP_HOST}")
    print(f"SMTP Port: {settings.SMTP_PORT}")
    print(f"SMTP User: {settings.SMTP_USER}")
    
    if not settings.SMTP_USER:
        print("❌ Error: SMTP_USER is not set in .env")
        return

    recipient = settings.SMTP_USER # Send to self for testing
    subject = "Clarity Finance - Test Email"
    body = """
    <h1>Clarity Finance</h1>
    <p>This is a test email from your Clarity Finance backend.</p>
    <p>✅ SMTP Configuration is working correctly.</p>
    """
    
    print(f"Sending test email to {recipient}...")
    success = await EmailService.send_email(recipient, subject, body, html=True)
    
    if success:
        print("✅ Email sent successfully!")
    else:
        print("❌ Failed to send email. Check logs/console for details.")

if __name__ == "__main__":
    asyncio.run(main())
