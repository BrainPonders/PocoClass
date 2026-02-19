"""Health, authentication, and user-management routes."""

import os
from functools import wraps

import requests
from flask import Blueprint, jsonify, make_response, request

auth_users_bp = Blueprint("auth_users", __name__)

db = None
logger = None
sync_service = None
should_sync_func = None

COOKIE_NAME = "pococlass_session"


def set_session_cookie(response, session_token):
    """Set HttpOnly session cookie on response."""
    response.set_cookie(
        COOKIE_NAME,
        session_token,
        httponly=True,
        samesite="Lax",
        secure=request.scheme == "https",
        path="/",
    )
    return response


def clear_session_cookie(response):
    """Clear session cookie from response."""
    response.set_cookie(
        COOKIE_NAME,
        "",
        httponly=True,
        samesite="Lax",
        secure=request.scheme == "https",
        path="/",
        max_age=0,
    )
    return response


def require_auth(f):
    """Verify valid session token from cookie/Bearer and attach user to request."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_token = request.cookies.get(COOKIE_NAME)
        if not session_token:
            session_token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not session_token:
            return jsonify({"error": "No session token provided"}), 401

        session = db.get_session(session_token)
        if not session:
            return jsonify({"error": "Invalid or expired session"}), 401

        user = db.get_user_by_id(session["user_id"])
        if not user or user.get("is_enabled", 1) == 0:
            return jsonify({"error": "User account is disabled"}), 403

        request.current_user = session
        return f(*args, **kwargs)

    return decorated_function


def require_admin(f):
    """Require a valid session with admin role."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_token = request.cookies.get(COOKIE_NAME)
        if not session_token:
            session_token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not session_token:
            return jsonify({"error": "No session token provided"}), 401

        session = db.get_session(session_token)
        if not session or session["pococlass_role"] != "admin":
            return jsonify({"error": "Admin access required"}), 403

        request.current_user = session
        return f(*args, **kwargs)

    return decorated_function


def require_system_token_or_admin(f):
    """Accept either system API token (X-API-Key) or admin session token."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        system_token = request.headers.get("X-API-Key", "")
        if system_token:
            if db.validate_system_token(system_token):
                request.current_user = None
                request.is_system_token = True
                return f(*args, **kwargs)
            return jsonify({"error": "Invalid system API token"}), 401

        session_token = request.cookies.get(COOKIE_NAME)
        if not session_token:
            session_token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not session_token:
            return (
                jsonify(
                    {
                        "error": (
                            "No authentication provided. Use X-API-Key header for system token "
                            "or Authorization header for session token."
                        )
                    }
                ),
                401,
            )

        session = db.get_session(session_token)
        if not session:
            return jsonify({"error": "Invalid or expired session"}), 401

        if session["pococlass_role"] != "admin":
            return jsonify({"error": "Admin access required"}), 403

        user = db.get_user_by_id(session["user_id"])
        if not user or user.get("is_enabled", 1) == 0:
            return jsonify({"error": "User account is disabled"}), 403

        request.current_user = session
        request.is_system_token = False
        return f(*args, **kwargs)

    return decorated_function


def normalize_paperless_url(url):
    """Normalize Paperless URL by removing trailing slash and validating scheme."""
    if not url:
        raise ValueError("Paperless URL cannot be empty")

    url = url.strip()

    if not url.startswith("http://") and not url.startswith("https://"):
        raise ValueError("Paperless URL must start with http:// or https://")

    while url.endswith("/"):
        url = url[:-1]

    if url.count("/") < 2:
        raise ValueError("Invalid Paperless URL format")

    return url


def fetch_all_users_paginated(paperless_url, token, username):
    """Fetch current user from Paperless with robust pagination fallback."""
    try:
        user_response = requests.get(
            f"{paperless_url}/api/users/me/",
            headers={"Authorization": f"Token {token}"},
            timeout=10,
        )

        if user_response.status_code == 200:
            user_info = user_response.json()
            user_id = user_info.get("id")
            is_superuser = user_info.get("is_superuser", False)
            logger.info("Found user via /api/users/me/ endpoint")
            return user_info, user_id, is_superuser
        logger.warning(
            f"/api/users/me/ returned {user_response.status_code}, trying paginated user list"
        )
    except Exception as e:
        logger.warning(f"Error calling /api/users/me/: {e}")

    try:
        page = 1
        page_size = 25

        while True:
            users_response = requests.get(
                f"{paperless_url}/api/users/",
                headers={"Authorization": f"Token {token}"},
                params={"page": page, "page_size": page_size},
                timeout=10,
            )

            if users_response.status_code != 200:
                logger.error(f"/api/users/ returned {users_response.status_code}")
                break

            users_data = users_response.json()

            if isinstance(users_data, list):
                users = users_data
                has_next = False
            elif isinstance(users_data, dict):
                users = users_data.get("results", [])
                has_next = users_data.get("next") is not None
            else:
                logger.error(f"Unexpected API response format: {type(users_data)}")
                break

            for user in users:
                if user.get("username") == username:
                    user_info = user
                    user_id = user.get("id")
                    is_superuser = user.get("is_superuser", False)
                    logger.info(
                        f"Found user '{username}' via /api/users/ pagination (page {page})"
                    )
                    return user_info, user_id, is_superuser

            if not has_next:
                break

            page += 1
            if page > 100:
                logger.error("Exceeded maximum page limit (100) while searching for user")
                break

    except Exception as e:
        logger.error(f"Error during paginated user lookup: {e}")

    return None, None, None


@auth_users_bp.route("/api/health")
def health_check():
    """Health check endpoint for Docker/container orchestration."""
    try:
        db_status = "ok" if db else "error"
        build_number = os.environ.get("POCOCLASS_BUILD_NUMBER", "dev")
        return (
            jsonify(
                {"status": "healthy", "database": db_status, "version": "2.0", "build": build_number}
            ),
            200,
        )
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500


@auth_users_bp.route("/api/auth/status", methods=["GET"])
def auth_status():
    """Check if setup is completed and get system status."""
    try:
        is_setup = db.is_setup_completed()
        paperless_url = db.get_config("paperless_url") if is_setup else None

        return jsonify({"setupCompleted": is_setup, "paperlessUrl": paperless_url})
    except Exception as e:
        logger.error(f"Error checking auth status: {e}")
        return jsonify({"error": str(e)}), 500


@auth_users_bp.route("/api/auth/setup", methods=["POST"])
def setup():
    """Initial setup - connect to Paperless and create first admin."""
    try:
        data = request.json
        paperless_url = data.get("paperlessUrl")
        username = data.get("username")
        password = data.get("password")

        if not all([paperless_url, username, password]):
            return jsonify({"error": "Missing required fields"}), 400

        if db.is_setup_completed():
            return jsonify({"error": "Setup already completed"}), 400

        try:
            paperless_url = normalize_paperless_url(paperless_url)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        try:
            auth_response = requests.post(
                f"{paperless_url}/api/token/",
                json={"username": username, "password": password},
                timeout=10,
            )

            if auth_response.status_code != 200:
                return jsonify({"error": "Invalid Paperless credentials"}), 401

            paperless_token = auth_response.json().get("token")

            user_info, paperless_user_id, is_superuser = fetch_all_users_paginated(
                paperless_url, paperless_token, username
            )
            if not paperless_user_id:
                logger.error(
                    f"Could not retrieve user ID from Paperless for user '{username}'. "
                    "This may indicate Paperless API compatibility issues or network problems."
                )
                return (
                    jsonify(
                        {
                            "error": (
                                "Failed to retrieve user information from Paperless. "
                                "Please ensure your Paperless-ngx instance is accessible and up to date."
                            )
                        }
                    ),
                    500,
                )

            role = "admin" if is_superuser else "user"
            user_id = db.create_user(username, paperless_user_id, role)
            db.set_config("paperless_url", paperless_url)
            session_token = db.create_session(user_id, paperless_token)

            try:
                logger.info("Performing initial sync of Paperless data...")
                sync_service.sync_all(paperless_token, paperless_url, ensure_mandatory=False)
                logger.info("Initial sync completed successfully")
            except Exception as e:
                logger.warning(f"Initial sync failed (non-critical): {e}")

            logger.info(
                f"Initial setup (step 2) completed by user: {username}, awaiting validation (step 3)"
            )

            resp = make_response(
                jsonify(
                    {
                        "success": True,
                        "user": {"id": user_id, "username": username, "role": role},
                    }
                )
            )
            set_session_cookie(resp, session_token)
            return resp

        except requests.RequestException as e:
            logger.error(f"Error connecting to Paperless: {e}")
            return jsonify({"error": f"Failed to connect to Paperless: {str(e)}"}), 500

    except Exception as e:
        logger.error(f"Error during setup: {e}")
        return jsonify({"error": str(e)}), 500


@auth_users_bp.route("/api/auth/complete-setup", methods=["POST"])
@require_auth
def complete_setup_endpoint():
    """Mark setup as completed after step 3 validation."""
    try:
        data = request.json or {}
        skip_missing_data = data.get("skipMissingData", False)

        paperless_url = db.get_config("paperless_url")
        if not paperless_url:
            return jsonify({"error": "Paperless URL not configured"}), 400

        if skip_missing_data:
            logger.warning("Setup completed with missing mandatory data - user skipped creation")

        db.complete_setup(paperless_url)
        logger.info("Setup completed successfully")
        return jsonify({"success": True})

    except Exception as e:
        logger.error(f"Error completing setup: {e}")
        return jsonify({"error": str(e)}), 500


@auth_users_bp.route("/api/auth/login", methods=["POST"])
def login():
    """Login with Paperless credentials."""
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")

        if not all([username, password]):
            return jsonify({"error": "Missing username or password"}), 400

        if not db.is_setup_completed():
            return jsonify({"error": "Setup not completed"}), 400

        paperless_url = db.get_config("paperless_url")

        try:
            auth_response = requests.post(
                f"{paperless_url}/api/token/",
                json={"username": username, "password": password},
                timeout=10,
            )

            if auth_response.status_code != 200:
                db.add_log(
                    log_type="system",
                    level="warning",
                    message=f"Failed login attempt for user: {username}",
                    source="authentication",
                )
                return jsonify({"error": "Invalid credentials"}), 401

            paperless_token = auth_response.json().get("token")

            user_info, paperless_user_id, is_superuser = fetch_all_users_paginated(
                paperless_url, paperless_token, username
            )
            if not paperless_user_id:
                logger.error(
                    f"Could not retrieve user ID from Paperless for user '{username}'. "
                    "This may indicate Paperless API compatibility issues or network problems."
                )
                return (
                    jsonify(
                        {
                            "error": (
                                "Failed to retrieve user information from Paperless. "
                                "Please ensure your Paperless-ngx instance is accessible and up to date."
                            )
                        }
                    ),
                    500,
                )

            pococlass_user = db.get_user_by_paperless_id(paperless_user_id)
            if not pococlass_user:
                user_id = db.create_user(username, paperless_user_id, "user")
                if not user_id:
                    logger.error("Failed to create user, user_id is None")
                    return jsonify({"error": "Failed to create user"}), 500
                pococlass_user = db.get_user_by_id(user_id)
                if not pococlass_user:
                    logger.error(f"Failed to retrieve newly created user with id {user_id}")
                    return jsonify({"error": "Failed to retrieve user"}), 500
            else:
                user_id = pococlass_user["id"]
                db.update_last_login(user_id)

            session_token = db.create_session(user_id, paperless_token)

            try:
                if should_sync_func():
                    logger.info(f"Auto-syncing Paperless data on login for user: {username}")
                    sync_service.sync_all(paperless_token, paperless_url)
                else:
                    logger.info(f"Skipping auto-sync - data is fresh (user: {username})")
            except Exception as e:
                logger.warning(f"Auto-sync on login failed (non-critical): {e}")

            logger.info(f"User logged in: {username}")
            db.add_log(
                log_type="system",
                level="info",
                message=f"User logged in: {username}",
                source="authentication",
            )

            resp = make_response(
                jsonify(
                    {
                        "success": True,
                        "user": {
                            "id": user_id,
                            "username": username,
                            "role": pococlass_user["pococlass_role"],
                        },
                    }
                )
            )
            set_session_cookie(resp, session_token)
            return resp

        except requests.RequestException as e:
            logger.error(f"Error authenticating with Paperless: {e}")
            return jsonify({"error": "Failed to authenticate with Paperless"}), 500

    except Exception as e:
        logger.error(f"Error during login: {e}")
        return jsonify({"error": str(e)}), 500


@auth_users_bp.route("/api/auth/logout", methods=["POST"])
@require_auth
def logout():
    """Logout and destroy session."""
    try:
        session_token = request.cookies.get(COOKIE_NAME)
        if not session_token:
            session_token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if session_token:
            db.delete_session(session_token)
        resp = make_response(jsonify({"success": True}))
        clear_session_cookie(resp)
        return resp
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        return jsonify({"error": str(e)}), 500


@auth_users_bp.route("/api/auth/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get current user session."""
    try:
        user = request.current_user
        return jsonify(
            {
                "id": user["user_id"],
                "username": user["paperless_username"],
                "role": user["pococlass_role"],
                "paperlessUserId": user["paperless_user_id"],
            }
        )
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return jsonify({"error": str(e)}), 500


@auth_users_bp.route("/api/users", methods=["GET"])
@require_admin
def list_all_users():
    """List all users with Paperless groups (admin only)."""
    try:
        session = request.current_user
        paperless_url = db.get_config("paperless_url")
        headers = {
            "Authorization": f'Token {session["paperless_token"]}',
            "Content-Type": "application/json",
        }

        users_response = requests.get(f"{paperless_url}/api/users/", headers=headers, timeout=30)
        users_response.raise_for_status()
        paperless_data = users_response.json()

        groups_response = requests.get(f"{paperless_url}/api/groups/", headers=headers, timeout=30)
        groups_response.raise_for_status()
        groups_data = groups_response.json()

        group_map = {}
        if isinstance(groups_data, list):
            group_map = {g["id"]: g["name"] for g in groups_data}
        elif isinstance(groups_data, dict) and "results" in groups_data:
            group_map = {g["id"]: g["name"] for g in groups_data["results"]}

        if isinstance(paperless_data, list):
            paperless_users = paperless_data
        elif isinstance(paperless_data, dict) and "results" in paperless_data:
            paperless_users = paperless_data["results"]
        else:
            paperless_users = []

        pococlass_users = db.list_users()

        for user in pococlass_users:
            paperless_user = next(
                (p for p in paperless_users if p["id"] == user["paperless_user_id"]), None
            )
            if paperless_user:
                groups = paperless_user.get("groups", [])
                group_names = []
                for g in groups:
                    if isinstance(g, dict):
                        group_names.append(g["name"])
                    elif isinstance(g, int):
                        group_names.append(group_map.get(g, f"Group {g}"))
                user["groups"] = group_names if group_names else []
            else:
                user["groups"] = []

        return jsonify(pococlass_users)
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        return jsonify({"error": str(e)}), 500


@auth_users_bp.route("/api/users/<int:user_id>/role", methods=["PUT"])
@require_admin
def update_user_role_endpoint(user_id):
    """Update user role (admin only)."""
    try:
        data = request.json
        role = data.get("role")

        if role not in ["admin", "user"]:
            return jsonify({"error": "Invalid role"}), 400

        db.update_user_role(user_id, role)
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        return jsonify({"error": str(e)}), 500


@auth_users_bp.route("/api/users/<int:user_id>/enable", methods=["PUT"])
@require_admin
def enable_user_endpoint(user_id):
    """Enable user account (admin only)."""
    try:
        users = db.list_users()
        user = next((u for u in users if u["id"] == user_id), None)
        if not user:
            return jsonify({"error": "User not found"}), 404

        db.enable_user(user["paperless_user_id"])
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error enabling user: {e}")
        return jsonify({"error": str(e)}), 500


@auth_users_bp.route("/api/users/<int:user_id>/disable", methods=["PUT"])
@require_admin
def disable_user_endpoint(user_id):
    """Disable user account (admin only)."""
    try:
        if user_id == request.current_user["user_id"]:
            return jsonify({"error": "Cannot disable your own account"}), 400

        users = db.list_users()
        user = next((u for u in users if u["id"] == user_id), None)
        if not user:
            return jsonify({"error": "User not found"}), 404

        db.disable_user(user["paperless_user_id"])
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Error disabling user: {e}")
        return jsonify({"error": str(e)}), 500


@auth_users_bp.route("/api/users/all-paperless", methods=["GET"])
@require_admin
def get_all_paperless_users():
    """Get all Paperless users with their PocoClass status (admin only)."""
    try:
        session = request.current_user
        paperless_url = db.get_config("paperless_url")

        headers = {
            "Authorization": f'Token {session["paperless_token"]}',
            "Content-Type": "application/json",
        }
        response = requests.get(f"{paperless_url}/api/users/", headers=headers, timeout=30)
        response.raise_for_status()
        paperless_data = response.json()

        if isinstance(paperless_data, list):
            paperless_users = paperless_data
        elif isinstance(paperless_data, dict) and "results" in paperless_data:
            paperless_users = paperless_data["results"]
        else:
            logger.error(f"Unexpected Paperless API response format: {type(paperless_data)}")
            return jsonify({"error": "Unexpected API response format"}), 500

        groups_response = requests.get(f"{paperless_url}/api/groups/", headers=headers, timeout=30)
        groups_response.raise_for_status()
        groups_data = groups_response.json()

        group_map = {}
        if isinstance(groups_data, list):
            group_map = {g["id"]: g["name"] for g in groups_data}
        elif isinstance(groups_data, dict) and "results" in groups_data:
            group_map = {g["id"]: g["name"] for g in groups_data["results"]}

        pococlass_users = db.list_users()
        pococlass_map = {u["paperless_user_id"]: u for u in pococlass_users}

        result = []
        for paperless_user in paperless_users:
            if not paperless_user.get("username"):
                logger.warning(
                    f"User ID {paperless_user.get('id')} is missing username in Paperless API response"
                )

            pococlass_user = pococlass_map.get(paperless_user["id"])
            groups = paperless_user.get("groups", [])

            group_names = []
            for g in groups:
                if isinstance(g, dict):
                    group_names.append(g["name"])
                elif isinstance(g, int):
                    group_names.append(group_map.get(g, f"Group {g}"))
                else:
                    group_names.append(str(g))

            result.append(
                {
                    "paperless_id": paperless_user.get("id"),
                    "paperless_username": paperless_user.get(
                        "username", f"user_{paperless_user.get('id', 'unknown')}"
                    ),
                    "paperless_groups": group_names,
                    "is_active": paperless_user.get("is_active", False),
                    "is_staff": paperless_user.get("is_staff", False),
                    "is_superuser": paperless_user.get("is_superuser", False),
                    "is_registered": pococlass_user is not None,
                    "is_enabled": pococlass_user.get("is_enabled", False) if pococlass_user else False,
                    "pococlass_id": pococlass_user.get("id") if pococlass_user else None,
                    "pococlass_role": pococlass_user.get("role") if pococlass_user else None,
                    "last_login": pococlass_user.get("last_login") if pococlass_user else None,
                }
            )

        return jsonify(result)
    except Exception as e:
        logger.error(f"Error fetching Paperless users: {e}")
        return jsonify({"error": str(e)}), 500


def init_auth_users(app, db_instance, logger_instance, sync_service_instance, should_sync):
    """Inject dependencies and register health/auth/user routes."""
    global db, logger, sync_service, should_sync_func

    db = db_instance
    logger = logger_instance
    sync_service = sync_service_instance
    should_sync_func = should_sync

    if "auth_users" not in app.blueprints:
        app.register_blueprint(auth_users_bp)

