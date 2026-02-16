from typing import Dict, Optional

class SecretManager:
    def __init__(self):
        self._secrets: Dict[str, str] = {}

    def set_secret(self, key: str, value: str):
        self._secrets[key] = value

    def get_secret(self, key: str) -> Optional[str]:
        return self._secrets.get(key)

    def delete_secret(self, key: str):
        if key in self._secrets:
            del self._secrets[key]

secret_manager = SecretManager()
