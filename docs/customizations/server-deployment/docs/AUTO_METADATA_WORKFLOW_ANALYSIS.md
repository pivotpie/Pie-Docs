# Auto Metadata Workflow Analysis and Migration Guide

## Overview
This document analyzes the custom auto metadata workflow implementation found in Mayan EDMS 4.6 and provides a migration path to implement the same functionality in the current version (4.3).

## Key Differences Between Versions

### 1. Workflow Action Structure Changes

**Current Version (4.3):**
- Uses `fields` and `widgets` dictionary approach
- Uses `form_data` for accessing form input
- Uses `get_form_schema()` method for dynamic form generation
- Direct `context['document']` access

**Older Version (4.6) - Target Implementation:**
- Uses `form_fields` and `form_field_widgets` approach
- Uses `kwargs` for accessing form input (more reliable)
- Uses `get_form_fields()` and `get_form_fieldsets()` methods
- Uses `context['workflow_instance'].document` access pattern
- Enhanced templating support with `ModelTemplateField`

### 2. Enhanced Features in 4.6

1. **Better Form Field Management:**
   - Uses `FormFieldFilteredModelChoiceMultiple` for metadata types
   - Implements proper fieldsets for better UI organization
   - More robust permission handling

2. **Template Support:**
   - Uses `ModelTemplateField` for value fields
   - Supports template variables like `workflow_instance`
   - Enhanced context rendering capabilities

3. **Improved Error Handling:**
   - Better exception messages
   - More detailed error context

## Custom Workflow Actions Implemented

### 1. DocumentMetadataAddAction
- **Purpose:** Automatically add metadata types to documents during workflow transitions
- **Key Features:**
  - Multi-select metadata types
  - Permission-based filtering
  - Integrity error handling

### 2. DocumentMetadataEditAction
- **Purpose:** Edit metadata values using templates during workflow transitions
- **Key Features:**
  - Template-based value assignment
  - Dynamic metadata type selection
  - Support for workflow context variables

### 3. DocumentMetadataRemoveAction
- **Purpose:** Remove metadata types from documents during workflow transitions
- **Key Features:**
  - Multi-select metadata types for removal
  - Graceful handling of non-existent metadata

## Migration Steps

### Step 1: Update workflow_actions.py
Replace the current metadata workflow_actions.py with the enhanced version that includes:
- Improved form field handling
- Template support for dynamic values
- Better error handling and user feedback

### Step 2: Test Workflow Integration
- Verify workflow actions appear in the admin interface
- Test metadata addition, editing, and removal
- Validate template variable support

### Step 3: Create Sample Workflows
- Document type detection workflows
- Automatic metadata assignment based on content
- Conditional metadata updates

## Implementation Benefits

1. **Automated Document Processing:**
   - Automatic metadata assignment based on document type
   - Content-based metadata extraction and assignment
   - Workflow-driven document classification

2. **Enhanced User Experience:**
   - Reduced manual metadata entry
   - Consistent document categorization
   - Streamlined document processing workflows

3. **Template-Based Flexibility:**
   - Dynamic metadata values using document properties
   - Workflow instance context access
   - Conditional metadata assignment

## Files to Modify

1. `mayan/apps/metadata/workflow_actions.py` - Main workflow actions
2. Workflow configurations through admin interface
3. Document type settings for automatic workflow triggers

## Usage Examples

### Example 1: Auto-assign Department Metadata
```python
# In workflow action configuration:
# Metadata Type: Department
# Value Template: {{ workflow_instance.document.document_type.label }}
```

### Example 2: Content-Based Classification
```python
# Workflow can automatically assign metadata based on:
# - Document filename patterns
# - OCR text content
# - File properties
```

## Next Steps

1. Apply the enhanced workflow_actions.py to current version
2. Configure workflows through admin interface
3. Set up document types with automatic workflow triggers
4. Test with sample documents
5. Document specific workflow configurations for PieDocs use cases