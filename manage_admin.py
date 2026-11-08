"""
NEUROSCAN AI — Initial Administrator & RBAC Provisioning CLI
=============================================================
Usage:
  Interactive wizard:
    python manage_admin.py setup

  Command-line arguments:
    python manage_admin.py create-admin --email admin@example.com --password StrongPassword123! --name "System Administrator"
    python manage_admin.py assign-roles --email user@example.com --roles admin,doctor,technician
    python manage_admin.py list-users
"""
import sys
import getpass
import argparse
import uuid
from pathlib import Path
from datetime import datetime

# Bootstrap path
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "backend"))

from database import SessionLocal, User, UserRole, AuditLog, create_tables
from auth import hash_password, validate_password_strength


def setup_interactive():
    print("=" * 70)
    print("  NEUROSCAN AI — INITIAL ADMINISTRATOR & RBAC PROVISIONING WIZARD")
    print("=" * 70)
    print("\nThis utility securely creates or provisions an administrator account")
    print("with multiple role memberships (Admin, Doctor, Technician) on a single")
    print("verified email address without exposing credentials in code.\n")

    create_tables()
    db = SessionLocal()
    try:
        email = input("Enter Administrator Email (e.g. your Gmail): ").strip().lower()
        if not email or "@" not in email:
            print("[ERROR] Please enter a valid email address.")
            return

        full_name = input("Enter Full Professional Name [System Administrator]: ").strip()
        if not full_name:
            full_name = "System Administrator"

        username_default = email.split("@")[0].lower()
        username = input(f"Enter Username [{username_default}]: ").strip().lower()
        if not username:
            username = username_default

        # Password prompt (hidden)
        while True:
            password = getpass.getpass("Enter Strong Password (min 8 chars with letter & number): ")
            err = validate_password_strength(password)
            if err:
                print(f"[ERROR] {err}")
                continue
            confirm = getpass.getpass("Confirm Password: ")
            if password != confirm:
                print("[ERROR] Passwords do not match. Please try again.")
                continue
            break

        print("\nSelect role memberships to assign to this verified email identity:")
        print("  1. ALL THREE ROLES: Admin, Doctor, and Technician (Recommended)")
        print("  2. Admin Only")
        print("  3. Custom Roles")
        choice = input("Enter choice [1]: ").strip()

        if choice == "2":
            roles = ["admin"]
        elif choice == "3":
            custom = input("Enter comma-separated roles (admin, doctor, technician): ").strip()
            roles = [r.strip().lower() for r in custom.split(",") if r.strip().lower() in ("admin", "doctor", "technician")]
            if not roles:
                roles = ["admin"]
        else:
            roles = ["admin", "doctor", "technician"]

        # Check existing user
        user = db.query(User).filter(User.email == email).first()
        hashed = hash_password(password)

        if user:
            print(f"\n[INFO] Found existing account for '{email}'. Upgrading credentials and roles...")
            user.password_hash = hashed
            user.full_name = full_name
            user.is_email_verified = True
            user.is_active = True
            user.active_role = "admin"
        else:
            # Create new user
            user = User(
                id=str(uuid.uuid4()),
                username=username,
                email=email,
                full_name=full_name,
                role="admin",
                active_role="admin",
                password_hash=hashed,
                title="Hospital Administrator & Medical Director",
                avatar="".join(p[0] for p in full_name.split()[:2]).upper(),
                is_active=True,
                is_email_verified=True,
            )
            db.add(user)
            db.flush()

        # Update role memberships in user_roles
        for role in roles:
            existing_ur = db.query(UserRole).filter(
                UserRole.user_id == user.id,
                UserRole.role == role,
            ).first()
            if not existing_ur:
                db.add(UserRole(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    role=role,
                    assigned_by="cli_provisioning",
                ))

        # Audit log
        db.add(AuditLog(
            user_id=user.id,
            username=user.username,
            role="admin",
            action="PROVISION_ADMIN_CLI",
            details=f"Initial administrator provisioned with roles: {roles}",
            timestamp=datetime.utcnow(),
        ))
        db.commit()

        print("\n" + "=" * 70)
        print(" [SUCCESS] Administrator Account Successfully Provisioned!")
        print(f"  - Email Identity:     {user.email}")
        print(f"  - Username:           {user.username}")
        print(f"  - Verified Status:    Verified (Active)")
        print(f"  - Assigned Roles:     {', '.join(roles).upper()}")
        print("=" * 70)
        print("\nYou can now sign in at http://localhost:8000/login or run the app!")

    except Exception as e:
        print(f"\n[ERROR] Provisioning failed: {e}")
        db.rollback()
    finally:
        db.close()


def create_admin_cmd(email: str, password: str, name: str, roles_str: str = "admin,doctor,technician"):
    create_tables()
    db = SessionLocal()
    try:
        clean_email = email.strip().lower()
        err = validate_password_strength(password)
        if err:
            print(f"[ERROR] {err}")
            return False

        roles = [r.strip().lower() for r in roles_str.split(",") if r.strip().lower() in ("admin", "doctor", "technician")]
        if not roles:
            roles = ["admin"]

        user = db.query(User).filter(User.email == clean_email).first()
        hashed = hash_password(password)

        if user:
            user.password_hash = hashed
            user.full_name = name.strip()
            user.is_email_verified = True
            user.is_active = True
            user.active_role = "admin"
        else:
            username = clean_email.split("@")[0].lower()
            user = User(
                id=str(uuid.uuid4()),
                username=username,
                email=clean_email,
                full_name=name.strip(),
                role="admin",
                active_role="admin",
                password_hash=hashed,
                title="Hospital Administrator",
                avatar="".join(p[0] for p in name.split()[:2]).upper(),
                is_active=True,
                is_email_verified=True,
            )
            db.add(user)
            db.flush()

        for role in roles:
            existing = db.query(UserRole).filter(UserRole.user_id == user.id, UserRole.role == role).first()
            if not existing:
                db.add(UserRole(user_id=user.id, role=role, assigned_by="cli_provisioning"))

        db.commit()
        print(f"[OK] Account {clean_email} provisioned with roles: {roles}")
        return True
    finally:
        db.close()


def assign_roles_cmd(email: str, roles_str: str):
    create_tables()
    db = SessionLocal()
    try:
        clean_email = email.strip().lower()
        user = db.query(User).filter(User.email == clean_email).first()
        if not user:
            print(f"[ERROR] User with email '{clean_email}' not found.")
            return False

        roles = [r.strip().lower() for r in roles_str.split(",") if r.strip().lower() in ("admin", "doctor", "technician")]
        for role in roles:
            existing = db.query(UserRole).filter(UserRole.user_id == user.id, UserRole.role == role).first()
            if not existing:
                db.add(UserRole(user_id=user.id, role=role, assigned_by="cli_assign_roles"))
                print(f"  + Added role '{role}' to {clean_email}")
            else:
                print(f"  = Already has role '{role}'")

        db.commit()
        print(f"[OK] Roles updated for {clean_email}.")
        return True
    finally:
        db.close()


def list_users_cmd():
    create_tables()
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"\nRegistered Clinical Users ({len(users)}):")
        print("-" * 75)
        for u in users:
            roles = [r.role for r in db.query(UserRole).filter(UserRole.user_id == u.id).all()] or [u.role]
            status_str = "Verified" if u.is_email_verified else "UNVERIFIED"
            active_str = "Active" if u.is_active else "Inactive"
            print(f"• {u.username:<16} | {u.email:<28} | Roles: {','.join(roles):<20} | {status_str} ({active_str})")
        print("-" * 75)
    finally:
        db.close()


def test_email_cmd(target_email: str):
    from email_service import send_otp_email, is_smtp_configured
    from config import SMTP_HOST, SMTP_PORT, SMTP_USER
    print("=" * 60)
    print("  NEUROVISION AI — SMTP EMAIL DELIVERY TEST")
    print("=" * 60)
    print(f"Configured SMTP Server : {SMTP_HOST}:{SMTP_PORT}")
    print(f"Configured Sender User : {SMTP_USER}")
    print(f"Destination Email      : {target_email}")
    print(f"SMTP Mode              : {'LIVE SMTP' if is_smtp_configured() else 'LOCAL DEVELOPER MOCK'}\n")

    print(f"Attempting to dispatch test verification OTP to '{target_email}'...")
    success = send_otp_email(to_email=target_email, otp_code="849201", purpose="verify_email")
    if success and is_smtp_configured():
        print(f"\n[SUCCESS] Test email successfully sent to {target_email}!")
        print("Please check your inbox (and Spam folder) for the verification code.")
    elif success:
        print("\n[NOTE] System is in Developer Mode (SMTP credentials not yet configured).")
        print("The OTP was displayed in the terminal above. Add your Gmail App Password to .env to send real emails.")
    else:
        print("\n[ERROR] Email dispatch failed. Please verify your SMTP_USER and SMTP_PASSWORD in .env.")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="NeuroScan AI Administrator Provisioning CLI")
    subparsers = parser.add_subparsers(dest="command")

    # setup
    subparsers.add_parser("setup", help="Interactive administrator setup wizard")

    # create-admin
    ca = subparsers.add_parser("create-admin", help="Create or upgrade an administrator account")
    ca.add_argument("--email", required=True, help="Institutional email or Gmail")
    ca.add_argument("--password", required=True, help="Strong password")
    ca.add_argument("--name", default="System Administrator", help="Full name")
    ca.add_argument("--roles", default="admin,doctor,technician", help="Comma-separated roles")

    # assign-roles
    ar = subparsers.add_parser("assign-roles", help="Assign additional roles to an existing user")
    ar.add_argument("--email", required=True, help="User email")
    ar.add_argument("--roles", required=True, help="Comma-separated roles: admin,doctor,technician")

    # list-users
    subparsers.add_parser("list-users", help="List all registered staff accounts and their roles")

    # test-email
    te = subparsers.add_parser("test-email", help="Test SMTP email delivery to your inbox")
    te.add_argument("--to", required=True, help="Recipient email address to send test OTP to")

    args = parser.parse_args()

    if args.command == "setup" or len(sys.argv) == 1:
        setup_interactive()
    elif args.command == "create-admin":
        create_admin_cmd(args.email, args.password, args.name, args.roles)
    elif args.command == "assign-roles":
        assign_roles_cmd(args.email, args.roles)
    elif args.command == "list-users":
        list_users_cmd()
    elif args.command == "test-email":
        test_email_cmd(args.to)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

