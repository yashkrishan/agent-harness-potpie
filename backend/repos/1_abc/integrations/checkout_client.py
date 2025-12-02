import httpx
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class CheckoutClient:
    """Client library for checkout service to call fraud detection"""
    
    def __init__(self, fraud_service_url: str = "http://localhost:8000"):
        self.base_url = fraud_service_url
        self.client = httpx.AsyncClient(timeout=5.0)
    
    async def check_fraud(self, transaction_data: Dict) -> Dict:
        """Check transaction for fraud
        
        Args:
            transaction_data: Transaction information
            
        Returns:
            Fraud detection result
        """
        try:
            response = await self.client.post(
                f"{self.base_url}/api/v1/fraud/check",
                json=transaction_data
            )
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Error calling fraud service: {e}")
            # Fallback: allow transaction if service unavailable
            return {
                "fraud_score": 0,
                "risk_level": "low",
                "decision": "allow",
                "reason": "Fraud service unavailable, allowing transaction"
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from fraud service: {e}")
            return {
                "fraud_score": 0,
                "risk_level": "low",
                "decision": "allow",
                "reason": "Fraud service error, allowing transaction"
            }
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
