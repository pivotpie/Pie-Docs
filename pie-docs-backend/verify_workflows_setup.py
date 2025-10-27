"""
Verify Workflows Feature Setup
Checks that all required tables, endpoints, and configurations are in place
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import requests
import os
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
END = '\033[0m'

def print_success(message):
    print(f"{GREEN}✓ {message}{END}")

def print_error(message):
    print(f"{RED}✗ {message}{END}")

def print_warning(message):
    print(f"{YELLOW}⚠ {message}{END}")

def print_info(message):
    print(f"{BLUE}ℹ {message}{END}")

def check_database_connection():
    """Check if database is accessible"""
    print("\n" + "="*60)
    print("1. Checking Database Connection")
    print("="*60)

    try:
        db_host = os.getenv('DATABASE_HOST', 'localhost')
        db_port = os.getenv('DATABASE_PORT', '5434')
        db_name = os.getenv('DATABASE_NAME', 'piedocs')
        db_user = os.getenv('DATABASE_USER', 'postgres')
        db_password = os.getenv('DATABASE_PASSWORD', 'postgres')

        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        conn.close()
        print_success(f"Connected to database: {db_name} on {db_host}:{db_port}")
        return True
    except Exception as e:
        print_error(f"Database connection failed: {str(e)}")
        print_warning("Make sure PostgreSQL is running and credentials are correct")
        return False

def check_workflows_table():
    """Check if workflows table exists and has correct schema"""
    print("\n" + "="*60)
    print("2. Checking Workflows Table")
    print("="*60)

    try:
        db_host = os.getenv('DATABASE_HOST', 'localhost')
        db_port = os.getenv('DATABASE_PORT', '5434')
        db_name = os.getenv('DATABASE_NAME', 'piedocs')
        db_user = os.getenv('DATABASE_USER', 'postgres')
        db_password = os.getenv('DATABASE_PASSWORD', 'postgres')

        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password,
            cursor_factory=RealDictCursor
        )
        cursor = conn.cursor()

        # Check if workflows table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'workflows'
            );
        """)
        exists = cursor.fetchone()['exists']

        if not exists:
            print_error("Workflows table does not exist")
            print_warning("Run migrations: python database/run_migrations.py")
            return False

        print_success("Workflows table exists")

        # Check columns
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'workflows'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()

        required_columns = ['id', 'name', 'description', 'elements', 'connections',
                          'version', 'status', 'created_by', 'created_at', 'updated_at']

        existing_columns = [col['column_name'] for col in columns]

        for col in required_columns:
            if col in existing_columns:
                print_success(f"Column '{col}' exists")
            else:
                print_error(f"Column '{col}' is missing")
                return False

        # Check for workflows
        cursor.execute("SELECT COUNT(*) as count FROM workflows")
        count = cursor.fetchone()['count']
        print_info(f"Found {count} workflow(s) in database")

        conn.close()
        return True

    except Exception as e:
        print_error(f"Error checking workflows table: {str(e)}")
        return False

def check_workflow_executions_table():
    """Check if workflow_executions table exists"""
    print("\n" + "="*60)
    print("3. Checking Workflow Executions Table")
    print("="*60)

    try:
        db_host = os.getenv('DATABASE_HOST', 'localhost')
        db_port = os.getenv('DATABASE_PORT', '5434')
        db_name = os.getenv('DATABASE_NAME', 'piedocs')
        db_user = os.getenv('DATABASE_USER', 'postgres')
        db_password = os.getenv('DATABASE_PASSWORD', 'postgres')

        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password,
            cursor_factory=RealDictCursor
        )
        cursor = conn.cursor()

        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'workflow_executions'
            );
        """)
        exists = cursor.fetchone()['exists']

        if not exists:
            print_error("workflow_executions table does not exist")
            return False

        print_success("workflow_executions table exists")

        # Check columns
        required_columns = ['id', 'workflow_id', 'document_id', 'current_step_id',
                          'status', 'execution_data', 'started_at', 'completed_at',
                          'error_message', 'error_stack']

        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'workflow_executions'
        """)
        existing_columns = [col['column_name'] for col in cursor.fetchall()]

        for col in required_columns:
            if col in existing_columns:
                print_success(f"Column '{col}' exists")
            else:
                print_error(f"Column '{col}' is missing")
                return False

        # Check for executions
        cursor.execute("SELECT COUNT(*) as count FROM workflow_executions")
        count = cursor.fetchone()['count']
        print_info(f"Found {count} execution(s) in database")

        conn.close()
        return True

    except Exception as e:
        print_error(f"Error checking workflow_executions table: {str(e)}")
        return False

def check_backend_api():
    """Check if backend API is running and workflows endpoints are accessible"""
    print("\n" + "="*60)
    print("4. Checking Backend API")
    print("="*60)

    api_url = os.getenv('API_URL', 'http://localhost:8001')

    # Check health endpoint
    try:
        response = requests.get(f"{api_url}/health", timeout=5)
        if response.status_code == 200:
            print_success(f"Backend API is running at {api_url}")
        else:
            print_error(f"Backend health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to backend at {api_url}")
        print_warning("Make sure backend is running: python -m app.main")
        return False
    except Exception as e:
        print_error(f"Backend check failed: {str(e)}")
        return False

    # Check workflows endpoint (should require auth, but should exist)
    try:
        response = requests.get(f"{api_url}/api/v1/workflows")
        # We expect 401 (unauthorized) or 200 (if no auth), not 404
        if response.status_code in [200, 401]:
            print_success("Workflows API endpoint exists")
        else:
            print_error(f"Workflows endpoint returned: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Workflows endpoint check failed: {str(e)}")
        return False

    return True

def check_frontend_env():
    """Check if frontend environment is configured correctly"""
    print("\n" + "="*60)
    print("5. Checking Frontend Configuration")
    print("="*60)

    frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                                  'pie-docs-frontend', '.env.local')

    if not os.path.exists(frontend_path):
        print_warning(f".env.local not found at {frontend_path}")
        print_info("Create .env.local from .env.example")
        return False

    print_success(".env.local file exists")

    with open(frontend_path, 'r') as f:
        content = f.read()

        if 'VITE_API_URL' in content:
            print_success("VITE_API_URL is configured")

            # Extract value
            for line in content.split('\n'):
                if line.startswith('VITE_API_URL'):
                    url = line.split('=')[1].strip()
                    print_info(f"API URL: {url}")
        else:
            print_warning("VITE_API_URL not found in .env.local")
            print_info("Add: VITE_API_URL=http://localhost:8001")

        if 'VITE_USE_MOCK_DATA=false' in content:
            print_success("Mock data is disabled (using real API)")
        else:
            print_warning("Mock data may be enabled")
            print_info("Set: VITE_USE_MOCK_DATA=false")

    return True

def print_summary(checks):
    """Print summary of all checks"""
    print("\n" + "="*60)
    print("VERIFICATION SUMMARY")
    print("="*60)

    passed = sum(checks.values())
    total = len(checks)

    for check_name, result in checks.items():
        status = f"{GREEN}PASS{END}" if result else f"{RED}FAIL{END}"
        print(f"{status} - {check_name}")

    print(f"\n{passed}/{total} checks passed")

    if passed == total:
        print(f"\n{GREEN}{'='*60}")
        print("✓ All checks passed! Workflows feature is ready to use.")
        print(f"{'='*60}{END}\n")
        print_info("Next steps:")
        print("  1. Start backend: python -m app.main")
        print("  2. Start frontend: npm run dev")
        print("  3. Navigate to http://localhost:5173/workflows")
    else:
        print(f"\n{RED}{'='*60}")
        print("✗ Some checks failed. Please fix the issues above.")
        print(f"{'='*60}{END}\n")
        print_warning("Common fixes:")
        print("  - Run migrations: python database/run_migrations.py")
        print("  - Start backend: python -m app.main")
        print("  - Configure .env.local with VITE_API_URL=http://localhost:8001")

def main():
    """Run all verification checks"""
    print(f"\n{BLUE}{'='*60}")
    print("WORKFLOWS FEATURE SETUP VERIFICATION")
    print(f"{'='*60}{END}\n")

    checks = {
        "Database Connection": check_database_connection(),
        "Workflows Table": check_workflows_table(),
        "Workflow Executions Table": check_workflow_executions_table(),
        "Backend API": check_backend_api(),
        "Frontend Configuration": check_frontend_env()
    }

    print_summary(checks)

    # Return exit code based on results
    return 0 if all(checks.values()) else 1

if __name__ == "__main__":
    sys.exit(main())
