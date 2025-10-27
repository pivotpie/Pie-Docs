#!/bin/bash

# User Management Database Initialization Script
# This script initializes the user management system in the database

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/dbname
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p')

echo -e "${YELLOW}=== PieDocs User Management Database Initialization ===${NC}"
echo ""
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql command not found. Please install PostgreSQL client.${NC}"
    exit 1
fi

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
export PGPASSWORD=$DB_PASSWORD
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to database${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Run the schema creation script
echo -e "${YELLOW}Creating user management schema...${NC}"
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schema_user_management.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Schema created successfully${NC}"
else
    echo -e "${RED}Error: Failed to create schema${NC}"
    exit 1
fi
echo ""

# Verify installation
echo -e "${YELLOW}Verifying installation...${NC}"

# Check tables
TABLES=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'roles', 'permissions', 'user_roles', 'role_permissions')")
if [ "$TABLES" -eq 5 ]; then
    echo -e "${GREEN}✓ All tables created (5/5)${NC}"
else
    echo -e "${RED}Warning: Expected 5 tables, found $TABLES${NC}"
fi

# Check default roles
ROLES=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM roles WHERE is_system_role = true")
if [ "$ROLES" -ge 6 ]; then
    echo -e "${GREEN}✓ Default roles created ($ROLES)${NC}"
else
    echo -e "${RED}Warning: Expected 6 default roles, found $ROLES${NC}"
fi

# Check default permissions
PERMISSIONS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM permissions WHERE is_system_permission = true")
if [ "$PERMISSIONS" -ge 20 ]; then
    echo -e "${GREEN}✓ Default permissions created ($PERMISSIONS)${NC}"
else
    echo -e "${RED}Warning: Expected at least 20 default permissions, found $PERMISSIONS${NC}"
fi

# List system roles
echo ""
echo -e "${YELLOW}System Roles:${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT name, display_name, priority FROM roles WHERE is_system_role = true ORDER BY priority DESC"

echo ""
echo -e "${GREEN}=== User Management System Initialized Successfully ===${NC}"
echo ""
echo "Next steps:"
echo "1. Create your first admin user via the API or database"
echo "2. Start the backend server: cd .. && uvicorn app.main:app --reload"
echo "3. Start the frontend: cd ../../pie-docs-frontend && npm run dev"
echo "4. Access settings at: http://localhost:5173/settings"
echo ""
