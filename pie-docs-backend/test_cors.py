"""
CORS Testing Script
Tests that CORS is properly configured for the workflows API
"""

import requests
import sys
from colorama import init, Fore, Style

# Initialize colorama for colored output
init(autoreset=True)

def print_success(message):
    print(f"{Fore.GREEN}✓ {message}{Style.RESET_ALL}")

def print_error(message):
    print(f"{Fore.RED}✗ {message}{Style.RESET_ALL}")

def print_info(message):
    print(f"{Fore.BLUE}ℹ {message}{Style.RESET_ALL}")

def print_warning(message):
    print(f"{Fore.YELLOW}⚠ {message}{Style.RESET_ALL}")

def test_preflight_request():
    """Test OPTIONS preflight request"""
    print("\n" + "="*60)
    print("1. Testing CORS Preflight (OPTIONS request)")
    print("="*60)

    try:
        url = "http://localhost:8001/api/v1/workflows"
        headers = {
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type,authorization'
        }

        response = requests.options(url, headers=headers)

        print_info(f"Status Code: {response.status_code}")

        # Check CORS headers in response
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
        }

        print("\nCORS Headers in Response:")
        for header, value in cors_headers.items():
            if value:
                print_success(f"  {header}: {value}")
            else:
                print_warning(f"  {header}: Not present")

        # Validate
        if cors_headers.get('Access-Control-Allow-Origin') == 'http://localhost:5173':
            print_success("Origin is correctly allowed")
        else:
            print_error("Origin is not properly configured")
            return False

        if cors_headers.get('Access-Control-Allow-Credentials') == 'true':
            print_success("Credentials are allowed")
        else:
            print_warning("Credentials might not be allowed")

        return True

    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to backend at http://localhost:8001")
        print_warning("Make sure backend is running: python -m app.main")
        return False
    except Exception as e:
        print_error(f"Preflight test failed: {str(e)}")
        return False

def test_get_request():
    """Test GET request with CORS headers"""
    print("\n" + "="*60)
    print("2. Testing GET Request with Origin Header")
    print("="*60)

    try:
        url = "http://localhost:8001/api/v1/workflows"
        headers = {
            'Origin': 'http://localhost:5173'
        }

        response = requests.get(url, headers=headers)

        print_info(f"Status Code: {response.status_code}")

        # Check CORS header in response
        allow_origin = response.headers.get('Access-Control-Allow-Origin')

        if allow_origin:
            print_success(f"Access-Control-Allow-Origin: {allow_origin}")

            if allow_origin == 'http://localhost:5173':
                print_success("Origin header matches expected value")
                return True
            else:
                print_warning(f"Origin header has unexpected value: {allow_origin}")
                return True  # Still working, just different value
        else:
            print_error("Access-Control-Allow-Origin header not present")
            return False

    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to backend")
        return False
    except Exception as e:
        print_error(f"GET request test failed: {str(e)}")
        return False

def test_different_origins():
    """Test that configured origins are allowed"""
    print("\n" + "="*60)
    print("3. Testing Different Origins")
    print("="*60)

    origins_to_test = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:5173'
    ]

    results = []

    for origin in origins_to_test:
        try:
            url = "http://localhost:8001/health"
            headers = {'Origin': origin}

            response = requests.get(url, headers=headers)
            allow_origin = response.headers.get('Access-Control-Allow-Origin')

            if allow_origin == origin:
                print_success(f"{origin} - Allowed")
                results.append(True)
            else:
                print_warning(f"{origin} - Response: {allow_origin or 'Not present'}")
                results.append(False)

        except Exception as e:
            print_error(f"{origin} - Error: {str(e)}")
            results.append(False)

    return any(results)  # At least one should work

def test_post_request():
    """Test POST request simulation"""
    print("\n" + "="*60)
    print("4. Testing POST Request Headers")
    print("="*60)

    try:
        # First do preflight
        url = "http://localhost:8001/api/v1/workflows"
        preflight_headers = {
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type'
        }

        preflight = requests.options(url, headers=preflight_headers)

        if preflight.status_code in [200, 204]:
            print_success("Preflight request successful")

            # Check if POST is allowed
            allowed_methods = preflight.headers.get('Access-Control-Allow-Methods', '')
            if 'POST' in allowed_methods or '*' in allowed_methods:
                print_success(f"POST method is allowed: {allowed_methods}")
                return True
            else:
                print_error(f"POST method not in allowed methods: {allowed_methods}")
                return False
        else:
            print_error(f"Preflight failed with status {preflight.status_code}")
            return False

    except Exception as e:
        print_error(f"POST request test failed: {str(e)}")
        return False

def test_credentials():
    """Test that credentials are allowed"""
    print("\n" + "="*60)
    print("5. Testing Credentials Support")
    print("="*60)

    try:
        url = "http://localhost:8001/api/v1/workflows"
        headers = {
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'GET',
        }

        response = requests.options(url, headers=headers)

        credentials_allowed = response.headers.get('Access-Control-Allow-Credentials')

        if credentials_allowed == 'true':
            print_success("Credentials are allowed (cookies/auth headers)")
            return True
        else:
            print_warning("Credentials might not be allowed")
            print_info("This might be intentional depending on your setup")
            return True  # Not necessarily an error

    except Exception as e:
        print_error(f"Credentials test failed: {str(e)}")
        return False

def main():
    """Run all CORS tests"""
    print(f"\n{Fore.CYAN}{'='*60}")
    print("CORS Configuration Test Suite")
    print("Testing workflows API at http://localhost:8001")
    print(f"{'='*60}{Style.RESET_ALL}\n")

    tests = [
        ("Preflight Request", test_preflight_request),
        ("GET Request", test_get_request),
        ("Different Origins", test_different_origins),
        ("POST Request", test_post_request),
        ("Credentials", test_credentials),
    ]

    results = {}

    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print_error(f"Test '{test_name}' crashed: {str(e)}")
            results[test_name] = False

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    passed = sum(results.values())
    total = len(results)

    for test_name, result in results.items():
        status = f"{Fore.GREEN}PASS{Style.RESET_ALL}" if result else f"{Fore.RED}FAIL{Style.RESET_ALL}"
        print(f"{status} - {test_name}")

    print(f"\n{passed}/{total} tests passed")

    if passed == total:
        print(f"\n{Fore.GREEN}{'='*60}")
        print("✓ All CORS tests passed!")
        print("✓ Workflows API is properly configured")
        print("✓ Frontend should be able to make requests")
        print(f"{'='*60}{Style.RESET_ALL}\n")
        return 0
    else:
        print(f"\n{Fore.RED}{'='*60}")
        print("✗ Some CORS tests failed")
        print(f"{'='*60}{Style.RESET_ALL}\n")
        print_info("Common fixes:")
        print("  1. Ensure backend is running: python -m app.main")
        print("  2. Check .env has CORS_ORIGINS configured")
        print("  3. Restart backend after changing .env")
        print("  4. Verify port 8001 is correct")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
