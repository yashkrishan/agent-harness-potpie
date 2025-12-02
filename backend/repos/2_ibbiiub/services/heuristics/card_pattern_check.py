from typing import Dict, List
import re

class CardPatternCheck:
    """Check against known patterns of stolen or compromised cards"""
    
    def __init__(self):
        # In production, this would be loaded from database or external service
        self.blocked_patterns = [
            r"^4[0-9]{12}(?:[0-9]{3})?$",  # Example pattern
        ]
        self.blocked_bins = ["411111", "424242"]  # Test card BINs
    
    async def check(self, transaction_data: Dict, db) -> Dict:
        """Check card against known patterns
        
        Returns:
            Dict with score (0-100) and details
        """
        card_number = transaction_data.get("card_number", "")
        card_bin = card_number[:6]
        
        # Check against blocked BINs
        if card_bin in self.blocked_bins:
            return {
                "score": 100,
                "details": {
                    "reason": f"Card BIN {card_bin} is in blocked list",
                    "card_bin": card_bin
                }
            }
        
        # Check against patterns
        for pattern in self.blocked_patterns:
            if re.match(pattern, card_number):
                return {
                    "score": 90,
                    "details": {
                        "reason": "Card matches known fraud pattern",
                        "pattern": pattern
                    }
                }
        
        # Check for sequential numbers (potential test cards)
        if self._is_sequential(card_number):
            return {
                "score": 70,
                "details": {"reason": "Card number appears sequential"}
            }
        
        return {
            "score": 0,
            "details": {"reason": "Card pattern check passed"}
        }
    
    def _is_sequential(self, card_number: str) -> bool:
        """Check if card number is sequential"""
        digits = [int(d) for d in card_number if d.isdigit()]
        if len(digits) < 4:
            return False
        
        # Check if digits are sequential
        diffs = [digits[i+1] - digits[i] for i in range(len(digits)-1)]
        return all(d == diffs[0] for d in diffs) and abs(diffs[0]) == 1
