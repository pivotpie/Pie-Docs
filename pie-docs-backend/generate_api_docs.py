"""
Generate comprehensive API documentation in Markdown format
"""
import os
import re
from collections import defaultdict
from datetime import datetime

router_dir = 'app/routers'
exclude_files = ['cabinets.py', 'physical_locations.py', '__init__.py']

# Category metadata with descriptions and ordering
category_metadata = {
    'authentication': {'order': 1, 'desc': 'Authentication endpoints - Login, logout, token refresh, password reset, MFA'},
    'users': {'order': 2, 'desc': 'User management endpoints - Create, read, update, and delete users, assign roles'},
    'roles': {'order': 3, 'desc': 'Role management endpoints - Manage roles and assign permissions to roles'},
    'permissions': {'order': 4, 'desc': 'Permission management endpoints - View and manage system permissions'},
    'settings': {'order': 5, 'desc': 'System settings management - View and update system configuration'},
    'audit': {'order': 6, 'desc': 'Audit logs - View system audit trail and activity logs'},
    'documents': {'order': 7, 'desc': 'Document management and RAG endpoints'},
    'document-types': {'order': 8, 'desc': 'Document type management - Define and manage document types and their properties'},
    'folders': {'order': 9, 'desc': 'Folder organization - Hierarchical folder structure for document organization'},
    'tags': {'order': 10, 'desc': 'Document tagging - Create and manage tags for document categorization and filtering'},
    'annotations': {'order': 11, 'desc': 'Document annotations - Add comments, highlights, and threaded replies to documents'},
    'approvals': {'order': 12, 'desc': 'Approval workflows - Multi-step approval chains, routing rules, and bulk operations'},
    'workflows': {'order': 13, 'desc': 'Workflow management - Create, execute, and manage document workflows'},
    'tasks': {'order': 14, 'desc': 'Task management - Assign and track document-related tasks and workflows'},
    'notifications': {'order': 15, 'desc': 'Notifications - Real-time notifications for workflow events, approvals, and system updates'},
    'check-in-out': {'order': 16, 'desc': 'Document check-in/check-out - Document locking and version control system'},
    'ocr': {'order': 17, 'desc': 'OCR processing - Optical character recognition and document text extraction'},
    'classification': {'order': 18, 'desc': 'Document classification - AI-powered document type identification using LLM'},
    'Metadata Extraction': {'order': 19, 'desc': 'Metadata extraction - AI-powered metadata extraction using GPT-5-Nano Vision for multi-page documents'},
    'Metadata Schemas': {'order': 20, 'desc': 'Metadata schema management - Define and manage metadata schemas and fields for document types'},
    'embeddings': {'order': 21, 'desc': 'Embeddings generation - Generate vector embeddings for semantic search and RAG'},
    'search': {'order': 22, 'desc': 'Search and query endpoints'},
    'physical-barcodes': {'order': 23, 'desc': 'Barcode management - Generate, validate, and manage barcodes for physical documents and assets'},
    'physical-mobile': {'order': 24, 'desc': 'Mobile scanning - Barcode scanning, document capture, and offline operations'},
    'physical-print': {'order': 25, 'desc': 'Print management - Templates, printers, and print job management'},
    'warehouse': {'order': 26, 'desc': 'Warehouse management - Manage locations, warehouses, zones, shelves, racks, and physical documents'},
    'user-preferences': {'order': 27, 'desc': 'User preferences management - Manage user-specific settings and preferences'},
    'api-keys': {'order': 28, 'desc': 'API key management - Create, manage, and revoke API keys for programmatic access'},
    'system-monitoring': {'order': 29, 'desc': 'System monitoring - View system health, database stats, and cache management'},
}

def extract_endpoints():
    """Extract all endpoints from router files"""
    endpoints_by_category = defaultdict(list)

    for filename in os.listdir(router_dir):
        if not filename.endswith('.py') or filename in exclude_files:
            continue

        filepath = os.path.join(router_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

                # Find router tag
                tag_match = re.search(r'tags=\[\"([^\"]+)\"\]', content)
                if not tag_match:
                    continue

                category = tag_match.group(1)

                # Find router prefix
                prefix_match = re.search(r'prefix=\"([^\"]+)\"', content)
                prefix = prefix_match.group(1) if prefix_match else '/api/v1'

                # Find all endpoints
                endpoint_pattern = r'@router\.(get|post|put|patch|delete)\(\"([^\"]*?)\"(?:[^)]*?)\)\s*(?:async\s+)?def\s+(\w+)\([^)]*\):\s*\"\"\"([^\"]*?)\"\"\"'

                for match in re.finditer(endpoint_pattern, content, re.DOTALL):
                    method = match.group(1).upper()
                    path = match.group(2)
                    func_name = match.group(3)
                    docstring = match.group(4).strip().split('\n')[0].strip()

                    full_path = prefix + path if path else prefix

                    endpoints_by_category[category].append({
                        'method': method,
                        'path': full_path,
                        'function': func_name,
                        'description': docstring
                    })
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    return endpoints_by_category

def generate_markdown(endpoints_by_category):
    """Generate the Markdown documentation"""
    lines = []

    # Header
    lines.append('# PieDocs API Documentation')
    lines.append('')
    lines.append(f'**Version:** 1.0.0  ')
    lines.append(f'**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}  ')
    lines.append(f'**Base URL:** `http://localhost:8001`')
    lines.append('')
    lines.append('---')
    lines.append('')

    # Overview
    lines.append('## Overview')
    lines.append('')
    lines.append('This document provides a comprehensive reference for all PieDocs API endpoints organized by category.')
    lines.append('The API is RESTful and returns JSON responses. Authentication is required for most endpoints.')
    lines.append('')
    lines.append('### Quick Stats')
    lines.append('')
    total_endpoints = sum(len(eps) for eps in endpoints_by_category.values())
    lines.append(f'- **Total Categories:** {len(endpoints_by_category)}')
    lines.append(f'- **Total Endpoints:** {total_endpoints}')
    lines.append(f'- **Authentication:** Bearer Token (JWT)')
    lines.append('')
    lines.append('---')
    lines.append('')

    # Table of Contents
    lines.append('## Table of Contents')
    lines.append('')

    # Sort categories by order
    sorted_categories = sorted(
        endpoints_by_category.keys(),
        key=lambda cat: category_metadata.get(cat, {}).get('order', 999)
    )

    for idx, category in enumerate(sorted_categories, 1):
        anchor = category.lower().replace(' ', '-').replace('/', '')
        lines.append(f'{idx}. [{category}](#{anchor})')

    lines.append('')
    lines.append('---')
    lines.append('')

    # Generate endpoint documentation for each category
    for category in sorted_categories:
        endpoints = endpoints_by_category[category]
        meta = category_metadata.get(category, {})

        lines.append(f'## {category}')
        lines.append('')
        if meta.get('desc'):
            lines.append(f'**{meta["desc"]}**')
            lines.append('')
        lines.append(f'Total Endpoints: **{len(endpoints)}**')
        lines.append('')

        # Sort endpoints by path and method
        method_priority = {'GET': 1, 'POST': 2, 'PUT': 3, 'PATCH': 4, 'DELETE': 5}
        sorted_endpoints = sorted(endpoints, key=lambda e: (e['path'], method_priority.get(e['method'], 99)))

        for endpoint in sorted_endpoints:
            # Method badge with emoji
            method_badge = {
                'GET': '🟢',
                'POST': '🔵',
                'PUT': '🟡',
                'PATCH': '🟠',
                'DELETE': '🔴'
            }.get(endpoint['method'], '⚪')

            lines.append(f'### {method_badge} `{endpoint["method"]}` {endpoint["path"]}')
            lines.append('')
            if endpoint['description']:
                lines.append(f'**Description:** {endpoint["description"]}')
                lines.append('')
            lines.append(f'**Function:** `{endpoint["function"]}()`')
            lines.append('')
            lines.append('---')
            lines.append('')

    # Authentication section
    lines.append('## Authentication')
    lines.append('')
    lines.append('Most endpoints require authentication using a JWT Bearer token.')
    lines.append('')
    lines.append('### Getting a Token')
    lines.append('')
    lines.append('Use the `/api/v1/auth/login` endpoint to obtain an access token:')
    lines.append('')
    lines.append('```bash')
    lines.append('curl -X POST http://localhost:8001/api/v1/auth/login \\')
    lines.append('  -H "Content-Type: application/json" \\')
    lines.append('  -d \'{')
    lines.append('    "username": "your_username",')
    lines.append('    "password": "your_password"')
    lines.append('  }\'')
    lines.append('```')
    lines.append('')
    lines.append('### Using the Token')
    lines.append('')
    lines.append('Include the token in the Authorization header:')
    lines.append('')
    lines.append('```bash')
    lines.append('curl -X GET http://localhost:8001/api/v1/documents \\')
    lines.append('  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"')
    lines.append('```')
    lines.append('')
    lines.append('---')
    lines.append('')

    # Response formats
    lines.append('## Response Formats')
    lines.append('')
    lines.append('### Success Response')
    lines.append('')
    lines.append('```json')
    lines.append('{')
    lines.append('  "success": true,')
    lines.append('  "data": { ... },')
    lines.append('  "message": "Operation completed successfully"')
    lines.append('}')
    lines.append('```')
    lines.append('')
    lines.append('### Error Response')
    lines.append('')
    lines.append('```json')
    lines.append('{')
    lines.append('  "detail": "Error message describing what went wrong"')
    lines.append('}')
    lines.append('```')
    lines.append('')
    lines.append('---')
    lines.append('')

    # Status codes
    lines.append('## Status Codes')
    lines.append('')
    lines.append('| Code | Description |')
    lines.append('|------|-------------|')
    lines.append('| 200 | Success - Request completed successfully |')
    lines.append('| 201 | Created - Resource created successfully |')
    lines.append('| 204 | No Content - Request succeeded with no response body |')
    lines.append('| 400 | Bad Request - Invalid request parameters |')
    lines.append('| 401 | Unauthorized - Authentication required or failed |')
    lines.append('| 403 | Forbidden - Insufficient permissions |')
    lines.append('| 404 | Not Found - Resource not found |')
    lines.append('| 409 | Conflict - Resource conflict (e.g., duplicate) |')
    lines.append('| 500 | Server Error - Internal server error |')
    lines.append('| 503 | Service Unavailable - Service temporarily unavailable |')
    lines.append('')
    lines.append('---')
    lines.append('')

    # Additional resources
    lines.append('## Additional Resources')
    lines.append('')
    lines.append('- **Interactive API Docs:** [http://localhost:8001/docs](http://localhost:8001/docs) (Swagger UI)')
    lines.append('- **Alternative Docs:** [http://localhost:8001/redoc](http://localhost:8001/redoc) (ReDoc)')
    lines.append('- **Health Check:** [http://localhost:8001/health](http://localhost:8001/health)')
    lines.append('- **API Status:** [http://localhost:8001/api/v1/status](http://localhost:8001/api/v1/status)')
    lines.append('')
    lines.append('---')
    lines.append('')
    lines.append(f'*Documentation generated from PieDocs API v1.0.0*')

    return '\n'.join(lines)

if __name__ == '__main__':
    print("Extracting endpoints from routers...")
    endpoints = extract_endpoints()

    print(f"Found {sum(len(eps) for eps in endpoints.values())} endpoints across {len(endpoints)} categories")

    print("Generating Markdown documentation...")
    markdown = generate_markdown(endpoints)

    # Write to file
    output_file = 'docs/customizations/api-documentation.md'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(markdown)

    print(f"SUCCESS: Documentation written to: {output_file}")
    print(f"   Total lines: {len(markdown.splitlines())}")
