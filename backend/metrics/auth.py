"""
Authentication metrics for Prometheus monitoring.

Tracks OAuth adoption rate, login success rate, registrations, logins, and failures.
"""

from prometheus_client import Counter, Gauge, Histogram

# Registration metrics
REGISTRATION_ATTEMPTS = Counter(
    'auth_registration_total',
    'Total number of registration attempts',
    ['status']  # 'success', 'failure', 'duplicate'
)

REGISTRATION_BY_SOURCE = Counter(
    'auth_registration_by_source_total',
    'Total number of registrations by OAuth source',
    ['source']  # 'github'
)

# Login metrics
LOGIN_ATTEMPTS = Counter(
    'auth_login_total',
    'Total number of login attempts',
    ['status', 'method']  # status: 'success', 'failure'; method: 'github', 'token'
)

LOGIN_LATENCY = Histogram(
    'auth_login_duration_seconds',
    'Time taken to complete login process',
    ['method'],  # 'github', 'token'
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# OAuth flow metrics
OAUTH_FLOW_INITIATED = Counter(
    'auth_oauth_flow_initiated_total',
    'Total number of OAuth flows initiated',
    ['provider']  # 'github'
)

OAUTH_FLOW_COMPLETED = Counter(
    'auth_oauth_flow_completed_total',
    'Total number of OAuth flows completed',
    ['provider', 'status']  # provider: 'github'; status: 'success', 'failure', 'denied'
)

OAUTH_FLOW_DURATION = Histogram(
    'auth_oauth_flow_duration_seconds',
    'Time taken to complete OAuth flow (from initiation to callback)',
    ['provider'],  # 'github'
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0, 25.0, 50.0, 100.0]
)

# Session metrics
ACTIVE_SESSIONS = Gauge(
    'auth_active_sessions',
    'Number of currently active sessions'
)

SESSION_CREATED = Counter(
    'auth_session_created_total',
    'Total number of sessions created'
)

SESSION_EXPIRED = Counter(
    'auth_session_expired_total',
    'Total number of sessions that expired'
)

SESSION_REVOKED = Counter(
    'auth_session_revoked_total',
    'Total number of sessions manually revoked'
)

# Logout metrics
LOGOUT_ATTEMPTS = Counter(
    'auth_logout_total',
    'Total number of logout attempts',
    ['status']  # 'success', 'failure'
)

# Token metrics
TOKEN_REFRESH_ATTEMPTS = Counter(
    'auth_token_refresh_total',
    'Total number of token refresh attempts',
    ['status']  # 'success', 'failure'
)

# Error tracking
AUTH_ERRORS = Counter(
    'auth_errors_total',
    'Total number of authentication errors',
    ['error_type', 'endpoint']  # error_type: 'invalid_token', 'expired_session', 'oauth_failure', etc.
)


def record_registration(status: str = 'success') -> None:
    """Record a registration attempt."""
    REGISTRATION_ATTEMPTS.labels(status=status).inc()


def record_registration_by_source(source: str = 'github') -> None:
    """Record a successful registration by OAuth source."""
    REGISTRATION_BY_SOURCE.labels(source=source).inc()


def record_login(status: str, method: str = 'github') -> None:
    """Record a login attempt."""
    LOGIN_ATTEMPTS.labels(status=status, method=method).inc()


def record_login_latency(duration: float, method: str = 'github') -> None:
    """Record login latency."""
    LOGIN_LATENCY.labels(method=method).observe(duration)


def record_oauth_initiated(provider: str = 'github') -> None:
    """Record an OAuth flow initiation."""
    OAUTH_FLOW_INITIATED.labels(provider=provider).inc()


def record_oauth_completed(provider: str = 'github', status: str = 'success') -> None:
    """Record an OAuth flow completion."""
    OAUTH_FLOW_COMPLETED.labels(provider=provider, status=status).inc()


def record_oauth_duration(duration: float, provider: str = 'github') -> None:
    """Record OAuth flow duration."""
    OAUTH_FLOW_DURATION.labels(provider=provider).observe(duration)


def set_active_sessions(count: int) -> None:
    """Set the current number of active sessions."""
    ACTIVE_SESSIONS.set(count)


def increment_active_sessions() -> None:
    """Increment active session count."""
    ACTIVE_SESSIONS.inc()


def decrement_active_sessions() -> None:
    """Decrement active session count."""
    ACTIVE_SESSIONS.dec()


def record_session_created() -> None:
    """Record a new session creation."""
    SESSION_CREATED.inc()


def record_session_expired() -> None:
    """Record a session expiration."""
    SESSION_EXPIRED.inc()


def record_session_revoked() -> None:
    """Record a manual session revocation."""
    SESSION_REVOKED.inc()


def record_logout(status: str = 'success') -> None:
    """Record a logout attempt."""
    LOGOUT_ATTEMPTS.labels(status=status).inc()


def record_token_refresh(status: str = 'success') -> None:
    """Record a token refresh attempt."""
    TOKEN_REFRESH_ATTEMPTS.labels(status=status).inc()


def record_auth_error(error_type: str, endpoint: str) -> None:
    """Record an authentication error."""
    AUTH_ERRORS.labels(error_type=error_type, endpoint=endpoint).inc()
