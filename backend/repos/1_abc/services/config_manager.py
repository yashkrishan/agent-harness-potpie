from typing import Dict, Optional
import json
import os
from pathlib import Path

class ConfigManager:
    """Manages fraud detection configuration without code deployment"""
    
    def __init__(self, config_file: str = "fraud_config.json"):
        self.config_file = Path(config_file)
        self.config = self._load_config()
    
    def _load_config(self) -> Dict:
        """Load configuration from file or use defaults"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading config: {e}")
        
        # Default configuration
        return {
            "heuristic_weights": {
                "velocity": 0.25,
                "geographic": 0.20,
                "amount": 0.20,
                "card_pattern": 0.35
            },
            "risk_thresholds": {
                "low": 30.0,
                "medium": 60.0,
                "high": 80.0
            },
            "velocity_check": {
                "time_window_minutes": 5,
                "max_transactions": 3
            },
            "enabled_heuristics": [
                "velocity",
                "geographic",
                "amount",
                "card_pattern"
            ]
        }
    
    def get_config(self) -> Dict:
        """Get current configuration"""
        return self.config.copy()
    
    def update_config(self, updates: Dict):
        """Update configuration
        
        Args:
            updates: Configuration updates to apply
        """
        self.config.update(updates)
        self._save_config()
    
    def _save_config(self):
        """Save configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            print(f"Error saving config: {e}")
    
    def get_heuristic_weight(self, heuristic_name: str) -> float:
        """Get weight for a specific heuristic"""
        return self.config.get("heuristic_weights", {}).get(heuristic_name, 0.25)
    
    def is_heuristic_enabled(self, heuristic_name: str) -> bool:
        """Check if a heuristic is enabled"""
        return heuristic_name in self.config.get("enabled_heuristics", [])
