import os
import resend
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY")
        if not self.api_key:
            logger.warning("RESEND_API_KEY not found in environment variables. Email service will not work.")
        else:
            resend.api_key = self.api_key
        
        # Default sender
        self.default_from = "Clarity Finance <onboarding@resend.dev>"

    def send_email(self, to_email: str | List[str], subject: str, html_content: str, from_email: str = None) -> Dict[str, Any]:
        """
        Send a single email.
        """
        if not self.api_key:
            logger.error("Cannot send email: RESEND_API_KEY is missing")
            return {"error": "Configuration missing"}

        try:
            params = {
                "from": from_email or self.default_from,
                "to": to_email if isinstance(to_email, list) else [to_email],
                "subject": subject,
                "html": html_content
            }

            email = resend.Emails.send(params)
            logger.info(f"Email sent to {to_email}: {email}")
            return email

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            raise e

    def send_batch_emails(self, emails: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Send a batch of emails.
        Each item in `emails` should have 'to', 'subject', 'html'.
        """
        if not self.api_key:
            logger.error("Cannot send batch emails: RESEND_API_KEY is missing")
            return {"error": "Configuration missing"}

        try:
            params = []
            for item in emails:
                params.append({
                    "from": item.get("from", self.default_from),
                    "to": item["to"] if isinstance(item["to"], list) else [item["to"]],
                    "subject": item["subject"],
                    "html": item["html"]
                })

            response = resend.Batch.send(params)
            logger.info(f"Batch emails sent: {response}")
            return response

        except Exception as e:
            logger.error(f"Failed to send batch emails: {str(e)}")
            raise e

# Singleton instance
email_service = EmailService()
