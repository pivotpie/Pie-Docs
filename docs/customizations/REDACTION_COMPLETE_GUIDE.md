# 🎯 Pie-Docs Redaction System - Complete Implementation Guide

**Master Document - All-in-One Reference**
**Created:** 2025-10-06 | **Version:** 1.0 | **Status:** Planning Phase

---

## 📑 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Quick Start Guide](#quick-start-guide)
3. [Architecture Overview](#architecture-overview)
4. [Database Design](#database-design)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Implementation Phases & Tasks](#implementation-phases--tasks)
8. [Code Examples & Patterns](#code-examples--patterns)
9. [Testing Strategy](#testing-strategy)
10. [Security & Permissions](#security--permissions)
11. [Deployment Guide](#deployment-guide)
12. [Progress Tracker](#progress-tracker)
13. [Reference Materials](#reference-materials)

---

# 1. EXECUTIVE SUMMARY

## 🎯 Project Goal

Implement a comprehensive document redaction system in Pie-Docs, based on Mayan EDMS architecture, enabling:
- **Pixel-level redactions** that permanently remove sensitive data
- **Non-destructive workflow** - original files never modified
- **Version management** - original and redacted versions co-exist
- **Export pipeline** - generate truly secure redacted PDFs

## 🔑 Core Principles (from Mayan EDMS)

### 1. Non-Destructive Transformations
```
Original Document (unchanged in storage)
    ↓
Redaction Metadata (database records)
    ↓
Runtime Application (on export only)
    ↓
Redacted Version (new file)
```

### 2. Pixel-Level Security
- Redactions stored as **percentage coordinates** (0-100)
- Export process **rasterizes pages** (PDF → Image → PDF)
- Redacted areas become **black pixels** (no text layer)
- Result: **Unrecoverable data deletion**

### 3. Version Management
- Original version always preserved
- Redacted version created as separate export
- Both versions visible in VersionsTool
- Clear visual indicators for each type

## 📊 Key Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Implementation Time | 6 weeks | ⏳ Pending |
| Test Coverage | >80% | ⏳ Pending |
| Security Audit | Pass | ⏳ Pending |
| Performance (10 pages) | <30 sec | ⏳ Pending |
| Performance (50 pages) | <2 min | ⏳ Pending |

---

# 2. QUICK START GUIDE

## 🚀 For New Developers

### Day 1 - Orientation (2 hours)
1. Read this section (30 min)
2. Review [Architecture Overview](#architecture-overview) (30 min)
3. Study [Code Examples](#code-examples--patterns) (1 hour)

### Day 2 - Setup (4 hours)
1. Set up development environment
2. Install dependencies (see [Backend Implementation](#backend-implementation))
3. Review Mayan EDMS reference code
4. Study current phase tasks

### Day 3 - Start Coding
1. Pick a task from [Progress Tracker](#progress-tracker)
2. Follow implementation guides
3. Write tests as you go

## 🔍 Quick Reference

### "How do I...?"

| Task | Section to Read |
|------|-----------------|
| Understand the system | [Architecture Overview](#architecture-overview) |
| Set up database | [Database Design](#database-design) |
| Implement canvas | [Frontend Implementation](#frontend-implementation) → RedactionCanvas |
| Build export pipeline | [Backend Implementation](#backend-implementation) → Export Service |
| Handle versions | [Frontend Implementation](#frontend-implementation) → VersionsTool |
| Write tests | [Testing Strategy](#testing-strategy) |
| Deploy | [Deployment Guide](#deployment-guide) |

## 📦 Technology Stack

### Backend
- **Framework:** FastAPI (Python)
- **Image Processing:** Pillow (PIL), pdf2image, img2pdf
- **Database:** PostgreSQL
- **Storage:** File system + database records

### Frontend
- **Framework:** React + TypeScript
- **PDF Rendering:** react-pdf, pdfjs-dist
- **Canvas:** HTML5 Canvas API
- **State:** Redux (redactionsSlice)

---

# 3. ARCHITECTURE OVERVIEW

## 🏗️ System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   PIE-DOCS REDACTION SYSTEM                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │         │   Backend    │         │   Storage    │
│   (React)    │◄───────►│  (FastAPI)   │◄───────►│  (Files DB)  │
└──────────────┘         └──────────────┘         └──────────────┘
      │                         │                         │
      │                         │                         │
      ▼                         ▼                         ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│ Redaction   │         │ Image       │         │ Original    │
│ Canvas UI   │         │ Processing  │         │ Documents   │
└─────────────┘         └─────────────┘         └─────────────┘
      │                         │                         │
      ▼                         ▼                         ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│ Versions    │         │ Export      │         │ Redacted    │
│ Tool UI     │         │ Pipeline    │         │ Versions    │
└─────────────┘         └─────────────┘         └─────────────┘
```

## 🔄 Data Flow

### Redaction Creation Flow
```
1. User draws rectangle on canvas
        ↓
2. Convert screen coords to percentages (0-100)
        ↓
3. POST /api/redactions { page, left, top, right, bottom }
        ↓
4. Insert into redactions table
        ↓
5. Return created record
        ↓
6. Update UI with new redaction
```

### Export Flow
```
1. User clicks "Export Redacted"
        ↓
2. POST /api/export-redacted
        ↓
3. Load PDF from storage
        ↓
4. Convert PDF pages → Images (pdf2image)
        ↓
5. For each page:
   - Get redactions for that page
   - Draw black rectangles (PIL ImageDraw)
        ↓
6. Convert Images → PDF (img2pdf)
        ↓
7. Save to /redacted/{document_id}/
        ↓
8. Create database record
        ↓
9. Return download URL
```

## 🎯 Coordinate System

```
┌─────────────────────────────────────┐
│ 0,0                          100,0  │  ◄── Top (0%)
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │     ┌──────────────┐          │  │
│  │     │  REDACTION   │          │  │  ◄── Stored as %
│  │     │  BOX         │          │  │      left: 25%
│  │     └──────────────┘          │  │      top: 30%
│  │                               │  │      right: 75%
│  └───────────────────────────────┘  │      bottom: 60%
│ 0,100                        100,100│  ◄── Bottom (100%)
└─────────────────────────────────────┘
     ▲                              ▲
  Left (0%)                    Right (100%)

CONVERSION TO PIXELS (at render time):
  left_px = (left_percent / 100) * image_width
  top_px = (top_percent / 100) * image_height
```

---

# 4. DATABASE DESIGN

## 📊 Schema Overview

### Table 1: `redactions`
**Purpose:** Store redaction metadata (non-destructive)

```sql
CREATE TABLE redactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,

    -- Percentage-based coordinates (0-100)
    left_percent DECIMAL(5,2) NOT NULL,
    top_percent DECIMAL(5,2) NOT NULL,
    right_percent DECIMAL(5,2) NOT NULL,
    bottom_percent DECIMAL(5,2) NOT NULL,

    -- Visual properties
    fill_color VARCHAR(7) DEFAULT '#000000',
    fill_transparency INTEGER DEFAULT 100,

    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Validation
    CONSTRAINT valid_percentages CHECK (
        left_percent >= 0 AND left_percent <= 100 AND
        top_percent >= 0 AND top_percent <= 100 AND
        right_percent >= 0 AND right_percent <= 100 AND
        bottom_percent >= 0 AND bottom_percent <= 100
    )
);

-- Indexes for performance
CREATE INDEX idx_redactions_document ON redactions(document_id);
CREATE INDEX idx_redactions_page ON redactions(document_id, page_number);
```

### Table 2: `document_redacted_versions`
**Purpose:** Track exported redacted versions

```sql
CREATE TABLE document_redacted_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    original_version_id UUID REFERENCES document_versions(id),

    -- File information
    redacted_file_path TEXT NOT NULL,
    redacted_file_hash VARCHAR(64),
    redacted_page_count INTEGER,

    -- Export configuration
    export_settings JSONB DEFAULT '{}',

    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one redacted version per original
    UNIQUE(document_id, original_version_id)
);

CREATE INDEX idx_redacted_versions_doc ON document_redacted_versions(document_id);
```

### Table 3: Update `document_versions`
**Purpose:** Link versions to redactions

```sql
ALTER TABLE document_versions
ADD COLUMN is_redacted BOOLEAN DEFAULT FALSE;

ALTER TABLE document_versions
ADD COLUMN redaction_source_id UUID REFERENCES document_redacted_versions(id);

ALTER TABLE document_versions
ADD COLUMN redaction_count INTEGER DEFAULT 0;
```

## 🔗 Entity Relationships

```
documents (1) ──── (N) redactions
    │
    │ (1)
    ↓
document_versions (1) ──── (1) document_redacted_versions
```

---

# 5. BACKEND IMPLEMENTATION

## 📂 File Structure

```
pie-docs-backend/
├── app/
│   ├── models/
│   │   └── redactions.py          # NEW: Pydantic models
│   ├── routers/
│   │   └── redactions.py          # NEW: API endpoints
│   └── services/
│       ├── redaction_service.py   # NEW: Core logic
│       └── image_processing_service.py  # NEW: PIL operations
└── database/
    └── migrations/
        └── 0XX_create_redactions.sql    # NEW: Schema
```

## 📦 Dependencies

```bash
# Install required packages
pip install Pillow>=10.0.0           # PIL for image manipulation
pip install pdf2image>=1.16.3        # PDF to image conversion
pip install img2pdf>=0.4.4           # Image to PDF conversion

# System dependency (Ubuntu/Debian)
sudo apt-get install poppler-utils   # PDF rendering
```

## 🔧 Implementation Details

### 1. Pydantic Models
**File:** `app/models/redactions.py`

```python
from pydantic import BaseModel, Field, validator
from typing import Optional
from uuid import UUID
from datetime import datetime

class RedactionBase(BaseModel):
    document_id: UUID
    page_number: int = Field(ge=1, description="Page number (1-indexed)")
    left_percent: float = Field(ge=0, le=100)
    top_percent: float = Field(ge=0, le=100)
    right_percent: float = Field(ge=0, le=100)
    bottom_percent: float = Field(ge=0, le=100)
    fill_color: str = "#000000"
    fill_transparency: int = Field(ge=0, le=100, default=100)

    @validator('right_percent')
    def validate_horizontal(cls, v, values):
        if 'left_percent' in values and v <= values['left_percent']:
            raise ValueError('right_percent must be greater than left_percent')
        return v

    @validator('bottom_percent')
    def validate_vertical(cls, v, values):
        if 'top_percent' in values and v <= values['top_percent']:
            raise ValueError('bottom_percent must be greater than top_percent')
        return v

class RedactionCreate(RedactionBase):
    pass

class Redaction(RedactionBase):
    id: UUID
    created_by: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True

class RedactedVersionBase(BaseModel):
    document_id: UUID
    original_version_id: Optional[UUID]
    redacted_file_path: str
    export_settings: dict = {}

class RedactedVersion(RedactedVersionBase):
    id: UUID
    redacted_file_hash: Optional[str]
    redacted_page_count: Optional[int]
    created_by: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True

class ExportSettings(BaseModel):
    resolution: int = Field(default=300, ge=72, le=600, description="DPI for rasterization")
    format: str = Field(default="pdf")
    include_metadata: bool = False
```

### 2. API Endpoints
**File:** `app/routers/redactions.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.redactions import (
    Redaction, RedactionCreate, RedactedVersion, ExportSettings
)
from app.services.redaction_service import RedactionService
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api", tags=["redactions"])

# ==========================================
# Redaction CRUD Operations
# ==========================================

@router.get("/documents/{document_id}/redactions", response_model=List[Redaction])
async def list_redactions(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all redactions for a document"""
    query = """
        SELECT * FROM redactions
        WHERE document_id = $1
        ORDER BY page_number, created_at
    """
    result = await db.fetch_all(query, document_id)
    return [Redaction.from_orm(r) for r in result]


@router.post("/documents/{document_id}/redactions",
             response_model=Redaction,
             status_code=status.HTTP_201_CREATED)
async def create_redaction(
    document_id: UUID,
    redaction: RedactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new redaction"""
    # Verify document exists and user has permission
    # ... permission check logic ...

    query = """
        INSERT INTO redactions (
            document_id, page_number,
            left_percent, top_percent, right_percent, bottom_percent,
            fill_color, fill_transparency, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    """
    result = await db.fetch_one(
        query,
        document_id,
        redaction.page_number,
        redaction.left_percent,
        redaction.top_percent,
        redaction.right_percent,
        redaction.bottom_percent,
        redaction.fill_color,
        redaction.fill_transparency,
        current_user.id
    )

    return Redaction.from_orm(result)


@router.delete("/redactions/{redaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_redaction(
    redaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a redaction"""
    query = "DELETE FROM redactions WHERE id = $1"
    await db.execute(query, redaction_id)
    return None


@router.put("/redactions/{redaction_id}", response_model=Redaction)
async def update_redaction(
    redaction_id: UUID,
    redaction: RedactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update redaction coordinates"""
    query = """
        UPDATE redactions
        SET left_percent = $1, top_percent = $2,
            right_percent = $3, bottom_percent = $4
        WHERE id = $5
        RETURNING *
    """
    result = await db.fetch_one(
        query,
        redaction.left_percent,
        redaction.top_percent,
        redaction.right_percent,
        redaction.bottom_percent,
        redaction_id
    )

    return Redaction.from_orm(result)


# ==========================================
# Export Operations
# ==========================================

@router.post("/documents/{document_id}/export-redacted", response_model=RedactedVersion)
async def export_redacted_document(
    document_id: UUID,
    settings: ExportSettings = ExportSettings(),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export document with redactions burned in"""
    # Get all redactions for document
    redactions_query = "SELECT * FROM redactions WHERE document_id = $1"
    redactions = await db.fetch_all(redactions_query, document_id)

    # Initialize redaction service
    service = RedactionService(db)

    # Export redacted version
    redacted_version = await service.export_redacted_document(
        document_id=document_id,
        redactions=[Redaction.from_orm(r) for r in redactions],
        settings=settings,
        user_id=current_user.id
    )

    return redacted_version


@router.get("/download/redacted/{version_id}")
async def download_redacted_version(
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Download redacted version"""
    from fastapi.responses import FileResponse

    query = "SELECT redacted_file_path FROM document_redacted_versions WHERE id = $1"
    result = await db.fetch_one(query, version_id)

    if not result:
        raise HTTPException(status_code=404, detail="Redacted version not found")

    return FileResponse(
        result['redacted_file_path'],
        media_type='application/pdf',
        filename=f'redacted_{version_id}.pdf'
    )
```

### 3. Image Processing Service
**File:** `app/services/image_processing_service.py`

```python
from PIL import Image, ImageDraw, ImageColor
from pdf2image import convert_from_path
import img2pdf
from typing import List, Tuple
import os

class ImageProcessingService:
    """Handle PDF ↔ Image conversions and transformations"""

    async def pdf_to_images(self, pdf_path: str, dpi: int = 300) -> List[Image.Image]:
        """
        Convert PDF pages to PIL Images

        Args:
            pdf_path: Path to PDF file
            dpi: Resolution for rendering (default 300)

        Returns:
            List of PIL Image objects
        """
        images = convert_from_path(
            pdf_path,
            dpi=dpi,
            fmt='RGB'
        )
        return images

    async def images_to_pdf(self, images: List[Image.Image], output_path: str) -> str:
        """
        Combine images into single PDF

        Args:
            images: List of PIL Images
            output_path: Where to save PDF

        Returns:
            Path to created PDF
        """
        # Save images to temporary files
        temp_files = []
        for i, img in enumerate(images):
            temp_path = f"/tmp/page_{i}.jpg"
            img.save(temp_path, 'JPEG', quality=95)
            temp_files.append(temp_path)

        # Convert to PDF
        with open(output_path, 'wb') as f:
            f.write(img2pdf.convert(temp_files))

        # Cleanup temp files
        for temp_file in temp_files:
            os.remove(temp_file)

        return output_path

    async def draw_redaction_rectangle(
        self,
        image: Image.Image,
        left: float,
        top: float,
        right: float,
        bottom: float,
        fill_color: str = "#000000",
        transparency: int = 100
    ) -> Image.Image:
        """
        Draw filled rectangle on image

        Args:
            image: PIL Image to draw on
            left, top, right, bottom: Coordinates in percentages (0-100)
            fill_color: Hex color (default black)
            transparency: Opacity 0-100 (default 100 = opaque)

        Returns:
            Modified PIL Image
        """
        # Convert percentages to pixels
        width, height = image.size
        left_px = int(left / 100.0 * width)
        top_px = int(top / 100.0 * height)
        right_px = int(right / 100.0 * width)
        bottom_px = int(bottom / 100.0 * height)

        # Convert color
        rgb = ImageColor.getrgb(fill_color)

        # Convert transparency to opacity (0-255)
        opacity = int((100 - transparency) / 100 * 255)
        rgba = rgb + (opacity,)

        # Draw rectangle
        draw = ImageDraw.Draw(image, mode='RGBA')
        draw.rectangle(
            xy=[(left_px, top_px), (right_px, bottom_px)],
            fill=rgba,
            outline=None
        )

        return image
```

### 4. Redaction Service
**File:** `app/services/redaction_service.py`

```python
from typing import List
from uuid import UUID
import hashlib
import os
from datetime import datetime
from app.models.redactions import Redaction, RedactedVersion, ExportSettings
from app.services.image_processing_service import ImageProcessingService

class RedactionService:
    """Core redaction processing service based on Mayan EDMS architecture"""

    def __init__(self, db):
        self.db = db
        self.image_service = ImageProcessingService()
        self.storage_base = "/storage/redacted"

    async def apply_redactions_to_page(
        self,
        page_image: Image,
        redactions: List[Redaction],
        page_number: int
    ) -> Image:
        """
        Apply redactions at pixel level using PIL

        Args:
            page_image: PIL Image of the page
            redactions: List of all redactions for document
            page_number: Current page number (1-indexed)

        Returns:
            PIL Image with redactions applied
        """
        # Filter redactions for this page
        page_redactions = [r for r in redactions if r.page_number == page_number]

        # Apply each redaction
        for redaction in page_redactions:
            page_image = await self.image_service.draw_redaction_rectangle(
                image=page_image,
                left=redaction.left_percent,
                top=redaction.top_percent,
                right=redaction.right_percent,
                bottom=redaction.bottom_percent,
                fill_color=redaction.fill_color,
                transparency=redaction.fill_transparency
            )

        return page_image

    async def export_redacted_document(
        self,
        document_id: UUID,
        redactions: List[Redaction],
        settings: ExportSettings,
        user_id: UUID
    ) -> RedactedVersion:
        """
        Export document with redactions burned in

        Process:
        1. Load original document
        2. Convert each page to image
        3. Apply redactions to each page
        4. Combine images into PDF
        5. Save to storage
        6. Create database record
        7. Return download URL

        Args:
            document_id: UUID of document to export
            redactions: List of redactions to apply
            settings: Export configuration
            user_id: User performing export

        Returns:
            RedactedVersion object with download URL
        """
        # 1. Get original document path
        doc_query = "SELECT file_path FROM documents WHERE id = $1"
        doc_result = await self.db.fetch_one(doc_query, document_id)
        original_path = doc_result['file_path']

        # 2. Convert PDF to images
        images = await self.image_service.pdf_to_images(
            original_path,
            dpi=settings.resolution
        )

        # 3. Apply redactions page by page
        redacted_images = []
        for page_num, image in enumerate(images, start=1):
            redacted_image = await self.apply_redactions_to_page(
                page_image=image,
                redactions=redactions,
                page_number=page_num
            )
            redacted_images.append(redacted_image)

        # 4. Combine into PDF
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"{document_id}_redacted_{timestamp}.pdf"
        output_dir = os.path.join(self.storage_base, str(document_id))
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, output_filename)

        await self.image_service.images_to_pdf(redacted_images, output_path)

        # 5. Calculate file hash
        with open(output_path, 'rb') as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()

        # 6. Create database record
        insert_query = """
            INSERT INTO document_redacted_versions (
                document_id, redacted_file_path, redacted_file_hash,
                redacted_page_count, export_settings, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        """
        result = await self.db.fetch_one(
            insert_query,
            document_id,
            output_path,
            file_hash,
            len(redacted_images),
            settings.dict(),
            user_id
        )

        # 7. Return redacted version
        return RedactedVersion.from_orm(result)
```

---

# 6. FRONTEND IMPLEMENTATION

## 📂 File Structure

```
pie-docs-frontend/src/
├── components/documents/tools/
│   ├── RedactionsTool.tsx              # NEW: Main UI
│   ├── RedactionCanvas.tsx             # NEW: Drawing canvas
│   ├── VersionComparisonModal.tsx      # NEW: Compare view
│   └── VersionsTool.tsx                # UPDATE: Enhanced
└── store/slices/
    └── redactionsSlice.ts              # NEW: State management
```

## 📦 Dependencies

```bash
# Install required packages
npm install react-pdf pdfjs-dist
npm install @reduxjs/toolkit react-redux
```

## 🎨 Component Implementation

### 1. RedactionCanvas Component
**File:** `src/components/documents/tools/RedactionCanvas.tsx`

```typescript
import React, { useRef, useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';

interface Point {
  x: number;
  y: number;
}

interface RedactionBox {
  id: string;
  pageNumber: number;
  left: number;    // percentage 0-100
  top: number;     // percentage 0-100
  right: number;   // percentage 0-100
  bottom: number;  // percentage 0-100
}

interface RedactionCanvasProps {
  documentUrl: string;
  pageNumber: number;
  redactions: RedactionBox[];
  onRedactionCreate: (redaction: Omit<RedactionBox, 'id'>) => void;
  onRedactionDelete: (id: string) => void;
}

export const RedactionCanvas: React.FC<RedactionCanvasProps> = ({
  documentUrl,
  pageNumber,
  redactions,
  onRedactionCreate,
  onRedactionDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // Convert screen coordinates to percentage
  const toPercentage = (point: Point): Point => {
    if (!canvasRef.current) return point;

    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (point.x / rect.width) * 100,
      y: (point.y / rect.height) * 100,
    };
  };

  // Convert percentage to screen coordinates
  const toScreen = (point: Point): Point => {
    if (!canvasRef.current) return point;

    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (point.x / 100) * rect.width,
      y: (point.y / 100) * rect.height,
    };
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setStartPoint(point);
    setCurrentPoint(point);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setCurrentPoint(point);
    drawTemporaryRedaction();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const endPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // Convert to percentages
    const startPct = toPercentage(startPoint);
    const endPct = toPercentage(endPoint);

    // Create redaction
    const newRedaction: Omit<RedactionBox, 'id'> = {
      pageNumber,
      left: Math.min(startPct.x, endPct.x),
      top: Math.min(startPct.y, endPct.y),
      right: Math.max(startPct.x, endPct.x),
      bottom: Math.max(startPct.y, endPct.y),
    };

    onRedactionCreate(newRedaction);

    // Reset drawing state
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  // Draw temporary redaction while dragging
  const drawTemporaryRedaction = () => {
    if (!canvasRef.current || !startPoint || !currentPoint) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw
    redrawCanvas();

    // Draw temporary box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  };

  // Redraw all existing redactions
  const redrawCanvas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing redactions
    const pageRedactions = redactions.filter(r => r.pageNumber === pageNumber);

    pageRedactions.forEach(redaction => {
      const topLeft = toScreen({ x: redaction.left, y: redaction.top });
      const bottomRight = toScreen({ x: redaction.right, y: redaction.bottom });

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;

      const x = topLeft.x;
      const y = topLeft.y;
      const width = bottomRight.x - topLeft.x;
      const height = bottomRight.y - topLeft.y;

      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    });
  };

  // Redraw on redactions change
  useEffect(() => {
    redrawCanvas();
  }, [redactions, pageNumber, canvasDimensions]);

  return (
    <div className="relative">
      <Document file={documentUrl}>
        <Page
          pageNumber={pageNumber}
          onLoadSuccess={(page) => {
            setCanvasDimensions({
              width: page.width,
              height: page.height,
            });
          }}
        />
      </Document>

      <canvas
        ref={canvasRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        className="absolute top-0 left-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ pointerEvents: 'auto' }}
      />
    </div>
  );
};
```

### 2. RedactionsTool Component
**File:** `src/components/documents/tools/RedactionsTool.tsx`

```typescript
import React, { useState } from 'react';
import { ToolPageLayout } from './ToolPageLayout';
import { RedactionCanvas } from './RedactionCanvas';
import type { DocumentToolProps } from './types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addRedaction,
  deleteRedaction,
  exportRedactedVersion,
  selectRedactions,
  selectExportStatus,
} from '@/store/slices/redactionsSlice';

interface RedactionBox {
  id: string;
  pageNumber: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const RedactionsTool: React.FC<DocumentToolProps & { onBack: () => void }> = ({
  document,
  onBack,
}) => {
  const dispatch = useAppDispatch();
  const redactions = useAppSelector(selectRedactions(document.id));
  const exportStatus = useAppSelector(selectExportStatus);

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = document.pageCount || 1;

  const handleRedactionCreate = async (redaction: Omit<RedactionBox, 'id'>) => {
    await dispatch(addRedaction({
      documentId: document.id,
      redaction,
    }));
  };

  const handleRedactionDelete = async (id: string) => {
    await dispatch(deleteRedaction(id));
  };

  const handleExport = async () => {
    await dispatch(exportRedactedVersion({
      documentId: document.id,
      settings: { resolution: 300, format: 'pdf' },
    }));
  };

  const pageRedactions = redactions.filter(r => r.pageNumber === currentPage);

  return (
    <ToolPageLayout title="Document Redactions" icon="🖍️" onBack={onBack}>
      <div className="grid grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="col-span-2">
          <div className="glass-panel p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white/70">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="btn-glass px-3 py-1"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-glass px-3 py-1"
                >
                  Next
                </button>
              </div>
            </div>

            <RedactionCanvas
              documentUrl={document.fileUrl}
              pageNumber={currentPage}
              redactions={redactions}
              onRedactionCreate={handleRedactionCreate}
              onRedactionDelete={handleRedactionDelete}
            />
          </div>
        </div>

        {/* Redaction List Sidebar */}
        <div className="col-span-1">
          <div className="glass-panel p-4 rounded-lg">
            <h3 className="text-white font-medium mb-4">
              Redactions ({redactions.length})
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {redactions.map(redaction => (
                <div
                  key={redaction.id}
                  className="glass-panel p-3 rounded hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/70">
                      Page {redaction.pageNumber}
                    </div>
                    <button
                      onClick={() => handleRedactionDelete(redaction.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    {redaction.left.toFixed(1)}%, {redaction.top.toFixed(1)}% →{' '}
                    {redaction.right.toFixed(1)}%, {redaction.bottom.toFixed(1)}%
                  </div>
                </div>
              ))}

              {redactions.length === 0 && (
                <div className="text-center text-white/50 py-8">
                  No redactions yet. Draw on the document to create one.
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <button
                onClick={handleExport}
                disabled={redactions.length === 0 || exportStatus === 'exporting'}
                className="btn-glass w-full py-2 hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {exportStatus === 'exporting' ? 'Exporting...' : 'Export Redacted Version'}
              </button>

              {exportStatus === 'success' && (
                <div className="mt-2 text-green-400 text-sm text-center">
                  Exported successfully!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};
```

### 3. Enhanced VersionsTool
**File:** `src/components/documents/tools/VersionsTool.tsx`

```typescript
import React from 'react';
import { ToolPageLayout } from './ToolPageLayout';
import type { DocumentToolProps } from './types';

interface DocumentVersion {
  id: string;
  version: string;
  date: string;
  user: string;
  changes: string;
  type: 'Major' | 'Minor';
  isRedacted: boolean;           // NEW
  originalVersionId?: string;    // NEW
  redactionCount?: number;       // NEW
  downloadUrl: string;           // NEW
}

export const VersionsTool: React.FC<DocumentToolProps & { onBack: () => void }> = ({
  document,
  onBack,
}) => {
  const versions: DocumentVersion[] = [
    {
      id: 'v3.2',
      version: 'v3.2',
      date: '2025-09-28',
      user: 'John Doe',
      changes: 'Liability terms revised',
      type: 'Major',
      isRedacted: false,
      downloadUrl: '/api/download/original/v3.2',
    },
    {
      id: 'v3.2-redacted',
      version: 'v3.2-redacted',
      date: '2025-09-28',
      user: 'Legal Team',
      changes: 'Redacted version with 5 sensitive areas removed',
      type: 'Major',
      isRedacted: true,
      originalVersionId: 'v3.2',
      redactionCount: 5,
      downloadUrl: '/api/download/redacted/v3.2-redacted',
    },
    {
      id: 'v3.1',
      version: 'v3.1',
      date: '2025-09-25',
      user: 'Jane Smith',
      changes: 'Scope definition clarified',
      type: 'Minor',
      isRedacted: false,
      downloadUrl: '/api/download/original/v3.1',
    },
  ];

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const handleCompare = (versionId: string) => {
    console.log('Compare version:', versionId);
    // TODO: Open VersionComparisonModal
  };

  return (
    <ToolPageLayout title="Version History" icon="📜" onBack={onBack}>
      <div className="space-y-3">
        {versions.map((version) => (
          <div
            key={version.id}
            className={`glass-panel p-4 rounded-lg transition-colors ${
              version.isRedacted ? 'border-l-4 border-orange-500' : 'border-l-4 border-blue-500'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium">{version.version}</span>

                  {version.isRedacted ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-300">
                      Redacted ({version.redactionCount})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300">
                      Original
                    </span>
                  )}

                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      version.type === 'Major'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}
                  >
                    {version.type}
                  </span>
                </div>
                <div className="text-sm text-white/70">{version.changes}</div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(version.downloadUrl)}
                  className="btn-glass text-xs px-3 py-1 hover:bg-indigo-500/20"
                  title={version.isRedacted ? 'Download Redacted' : 'Download Original'}
                >
                  ⬇️ Download
                </button>

                {version.isRedacted && (
                  <button
                    onClick={() => handleCompare(version.id)}
                    className="btn-glass text-xs px-3 py-1 hover:bg-purple-500/20"
                  >
                    Compare
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-white/50">
              <span>{version.user}</span>
              <span>•</span>
              <span>{version.date}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-white/10">
        <button className="btn-glass px-4 py-2 w-full hover:bg-indigo-500/20">
          Upload New Version
        </button>
      </div>
    </ToolPageLayout>
  );
};
```

### 4. Redux Slice
**File:** `src/store/slices/redactionsSlice.ts`

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import axios from 'axios';

interface RedactionBox {
  id: string;
  documentId: string;
  pageNumber: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface RedactionsState {
  redactions: Record<string, RedactionBox[]>;  // documentId -> redactions
  activeDocument: string | null;
  isDrawing: boolean;
  exportStatus: 'idle' | 'exporting' | 'success' | 'error';
  exportProgress: number;
}

const initialState: RedactionsState = {
  redactions: {},
  activeDocument: null,
  isDrawing: false,
  exportStatus: 'idle',
  exportProgress: 0,
};

// Async thunks
export const fetchRedactions = createAsyncThunk(
  'redactions/fetchRedactions',
  async (documentId: string) => {
    const response = await axios.get(`/api/documents/${documentId}/redactions`);
    return { documentId, redactions: response.data };
  }
);

export const addRedaction = createAsyncThunk(
  'redactions/addRedaction',
  async ({ documentId, redaction }: { documentId: string; redaction: Omit<RedactionBox, 'id'> }) => {
    const response = await axios.post(`/api/documents/${documentId}/redactions`, redaction);
    return { documentId, redaction: response.data };
  }
);

export const deleteRedaction = createAsyncThunk(
  'redactions/deleteRedaction',
  async (redactionId: string) => {
    await axios.delete(`/api/redactions/${redactionId}`);
    return redactionId;
  }
);

export const exportRedactedVersion = createAsyncThunk(
  'redactions/exportRedactedVersion',
  async ({ documentId, settings }: { documentId: string; settings: any }) => {
    const response = await axios.post(`/api/documents/${documentId}/export-redacted`, settings);
    return response.data;
  }
);

// Slice
const redactionsSlice = createSlice({
  name: 'redactions',
  initialState,
  reducers: {
    setActiveDocument(state, action: PayloadAction<string>) {
      state.activeDocument = action.payload;
    },
    setIsDrawing(state, action: PayloadAction<boolean>) {
      state.isDrawing = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch redactions
      .addCase(fetchRedactions.fulfilled, (state, action) => {
        state.redactions[action.payload.documentId] = action.payload.redactions;
      })
      // Add redaction
      .addCase(addRedaction.fulfilled, (state, action) => {
        const { documentId, redaction } = action.payload;
        if (!state.redactions[documentId]) {
          state.redactions[documentId] = [];
        }
        state.redactions[documentId].push(redaction);
      })
      // Delete redaction
      .addCase(deleteRedaction.fulfilled, (state, action) => {
        const redactionId = action.payload;
        Object.keys(state.redactions).forEach((docId) => {
          state.redactions[docId] = state.redactions[docId].filter(
            (r) => r.id !== redactionId
          );
        });
      })
      // Export
      .addCase(exportRedactedVersion.pending, (state) => {
        state.exportStatus = 'exporting';
        state.exportProgress = 0;
      })
      .addCase(exportRedactedVersion.fulfilled, (state) => {
        state.exportStatus = 'success';
        state.exportProgress = 100;
      })
      .addCase(exportRedactedVersion.rejected, (state) => {
        state.exportStatus = 'error';
      });
  },
});

// Actions
export const { setActiveDocument, setIsDrawing } = redactionsSlice.actions;

// Selectors
export const selectRedactions = (documentId: string) => (state: RootState) =>
  state.redactions.redactions[documentId] || [];

export const selectExportStatus = (state: RootState) => state.redactions.exportStatus;

export default redactionsSlice.reducer;
```

---

# 7. IMPLEMENTATION PHASES & TASKS

## 📋 6-Week Implementation Plan

### ✅ Phase 1: Database & Backend Foundation (Week 1)

**Goals:** Set up core infrastructure

#### Tasks:
- [ ] **1.1:** Create `redactions` table migration
  - Schema with all columns
  - Indexes for performance
  - Constraints for data validation

- [ ] **1.2:** Create `document_redacted_versions` table migration
  - Schema with all columns
  - Indexes and unique constraints

- [ ] **1.3:** Update `document_versions` table
  - Add `is_redacted`, `redaction_source_id`, `redaction_count` columns

- [ ] **1.4:** Implement Redaction Pydantic models
  - `RedactionBase`, `RedactionCreate`, `Redaction`
  - `RedactedVersionBase`, `RedactedVersion`
  - Add validators for percentage ranges

- [ ] **1.5:** Create CRUD API endpoints
  - `GET /api/documents/{doc_id}/redactions`
  - `POST /api/documents/{doc_id}/redactions`
  - `PUT /api/redactions/{redaction_id}`
  - `DELETE /api/redactions/{redaction_id}`

- [ ] **1.6:** Set up file storage structure
  - Create `/storage/redacted/` directory
  - Implement file naming convention
  - Add cleanup service

**Deliverables:** Working API for redaction CRUD, database schema in place

---

### ✅ Phase 2: Image Processing Core (Week 2)

**Goals:** Build PDF manipulation pipeline

#### Tasks:
- [ ] **2.1:** Install dependencies
  - `pip install Pillow>=10.0.0`
  - `pip install pdf2image>=1.16.3`
  - `pip install img2pdf>=0.4.4`
  - `sudo apt-get install poppler-utils`

- [ ] **2.2:** Implement `ImageProcessingService`
  - `pdf_to_images()` method
  - `images_to_pdf()` method
  - `draw_redaction_rectangle()` method

- [ ] **2.3:** Implement `RedactionService`
  - `apply_redactions_to_page()` method
  - `export_redacted_document()` method
  - Error handling for edge cases

- [ ] **2.4:** Create export API endpoint
  - `POST /api/documents/{doc_id}/export-redacted`
  - `GET /api/download/redacted/{version_id}`

- [ ] **2.5:** Test image processing
  - Test percentage → pixel conversion
  - Verify redacted areas have no text
  - Test with various PDF sizes
  - Benchmark performance

**Deliverables:** Working export pipeline that generates redacted PDFs

---

### ✅ Phase 3: Frontend - Redaction UI (Week 3)

**Goals:** Build interactive redaction interface

#### Tasks:
- [ ] **3.1:** Create `RedactionCanvas` component
  - Set up HTML5 Canvas
  - Implement PDF page rendering
  - Add mouse event handlers (down, move, up)
  - Convert screen coords → percentages
  - Draw existing redactions

- [ ] **3.2:** Create `RedactionsTool` component
  - Main layout with canvas area
  - Page navigation (prev/next)
  - Redaction list sidebar
  - Export button
  - Progress indicator

- [ ] **3.3:** Implement Redux slice
  - `redactionsSlice.ts` with state management
  - Async thunks for API calls
  - Selectors for components

- [ ] **3.4:** Connect to backend APIs
  - Fetch redactions on load
  - Create redaction on draw
  - Delete redaction
  - Export redacted version

- [ ] **3.5:** Add visual feedback
  - Loading states
  - Error messages
  - Success notifications
  - Drawing preview

**Deliverables:** Functional redaction UI with drawing capability

---

### ✅ Phase 4: Version Management Enhancement (Week 4)

**Goals:** Integrate redacted versions into UI

#### Tasks:
- [ ] **4.1:** Enhance `VersionsTool` component
  - Add `isRedacted` property to version interface
  - Show "Original" vs "Redacted" badges
  - Display redaction count
  - Add separate download buttons

- [ ] **4.2:** Update version list styling
  - Color-code version types (blue/orange)
  - Add visual indicators
  - Show version lineage

- [ ] **4.3:** Create `VersionComparisonModal` component
  - Split-screen layout
  - Load original and redacted side-by-side
  - Synchronized scrolling
  - Highlight redacted areas

- [ ] **4.4:** Add API integration for versions
  - Fetch all versions (original + redacted)
  - Handle download for both types
  - Link redacted versions to originals

**Deliverables:** Enhanced version management showing both original and redacted versions

---

### ✅ Phase 5: Integration & Polish (Week 5)

**Goals:** Polish UX and integrate with document viewer

#### Tasks:
- [ ] **5.1:** Integrate into document viewer
  - Add "Redact" button to toolbar
  - Show redaction overlay in preview
  - Add "View Redacted" toggle

- [ ] **5.2:** Implement export progress tracking
  - WebSocket updates for progress
  - Page-by-page progress display
  - Cancel export option

- [ ] **5.3:** Add background jobs for large documents
  - Set up Celery task queue
  - Queue exports > 20 pages
  - Email notification on completion

- [ ] **5.4:** Implement audit logging
  - Log redaction created/deleted
  - Log version exported/downloaded
  - Create audit log viewer UI

- [ ] **5.5:** Polish UI/UX
  - Smooth animations
  - Better error handling
  - Helpful tooltips
  - Keyboard shortcuts

**Deliverables:** Polished, production-ready feature

---

### ✅ Phase 6: Testing & Security (Week 6)

**Goals:** Ensure quality and security

#### Tasks:
- [ ] **6.1:** Backend unit tests
  - Test `RedactionService` methods
  - Test image processing functions
  - Test API endpoints
  - Test permission checks

- [ ] **6.2:** Backend integration tests
  - Full export pipeline end-to-end
  - Multi-page document handling
  - Large document (100+ pages)
  - Concurrent export requests

- [ ] **6.3:** Frontend tests
  - RedactionCanvas drawing
  - Coordinate conversion accuracy
  - API integration
  - VersionsTool display

- [ ] **6.4:** Security verification
  - Attempt text extraction → should fail
  - Try PDF editing tools → show black pixels
  - Verify original file unchanged
  - Test permission enforcement

- [ ] **6.5:** Performance testing
  - Redaction drawing < 100ms
  - Export speed benchmarks
  - Canvas rendering at 60 FPS
  - Memory profiling

- [ ] **6.6:** Documentation
  - API documentation (OpenAPI/Swagger)
  - User guide
  - Developer guide
  - Security documentation

**Deliverables:** Fully tested, secure, documented feature ready for production

---

# 8. CODE EXAMPLES & PATTERNS

## 🔑 Essential Patterns

### Pattern 1: Percentage-Based Coordinates

```python
# ❌ DON'T: Store pixel coordinates
redaction = {"left_px": 200, "top_px": 150, ...}  # Breaks on different resolutions

# ✅ DO: Store percentage coordinates
redaction = {"left_percent": 25.0, "top_percent": 25.0, ...}  # Resolution independent
```

**Conversion:**
```python
def to_pixels(percent: float, dimension: int) -> int:
    """Convert percentage to pixel coordinate"""
    return int(percent / 100.0 * dimension)

def to_percentage(pixel: int, dimension: int) -> float:
    """Convert pixel to percentage coordinate"""
    return (pixel / dimension) * 100.0
```

### Pattern 2: Export Pipeline

```python
async def export_redacted_document(document_id, redactions):
    # 1. Convert PDF to images
    images = pdf_to_images(original_pdf_path, dpi=300)

    # 2. Apply redactions page by page
    redacted_images = []
    for page_num, image in enumerate(images):
        page_redactions = [r for r in redactions if r.page_number == page_num + 1]
        for redaction in page_redactions:
            image = draw_redaction(image, redaction)
        redacted_images.append(image)

    # 3. Convert images back to PDF
    redacted_pdf_path = images_to_pdf(redacted_images)

    # 4. Save to storage
    stored_path = save_to_storage(redacted_pdf_path, document_id)

    # 5. Create database record
    redacted_version = await create_redacted_version_record(document_id, stored_path)

    return redacted_version
```

### Pattern 3: Canvas Drawing (Frontend)

```typescript
const handleMouseDown = (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;  // to percentage
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  setStartPoint({ x, y });
  setIsDrawing(true);
};

const handleMouseUp = (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  // Create redaction with percentage coordinates
  createRedaction({
    pageNumber: currentPage,
    left: Math.min(startPoint.x, x),
    top: Math.min(startPoint.y, y),
    right: Math.max(startPoint.x, x),
    bottom: Math.max(startPoint.y, y),
  });

  setIsDrawing(false);
};
```

### Pattern 4: Version Display

```typescript
interface EnhancedVersion {
  id: string;
  version: string;
  isRedacted: boolean;
  originalVersionId?: string;  // Link to source version
  redactionCount?: number;
  downloadUrl: string;
}

// Group versions together
const groupedVersions = versions.reduce((acc, version) => {
  const baseId = version.originalVersionId || version.id;
  if (!acc[baseId]) acc[baseId] = [];
  acc[baseId].push(version);
  return acc;
}, {});

// Display both original and redacted together
{groupedVersions[baseId].map(version => (
  <div key={version.id}>
    <span>{version.version}</span>
    {version.isRedacted && <Badge>Redacted ({version.redactionCount})</Badge>}
    <button onClick={() => download(version.downloadUrl)}>
      Download {version.isRedacted ? 'Redacted' : 'Original'}
    </button>
  </div>
))}
```

## 🚨 Common Pitfalls

### ❌ Don't: Modify Original File
```python
# BAD - modifies source
modify_pdf_in_place(original_path, redactions)
```

### ✅ Do: Create New File
```python
# GOOD - preserves original
redacted_path = export_with_redactions(original_path, redactions)
```

### ❌ Don't: Use PDF Annotations
```python
# BAD - can be removed with PDF tools
add_black_rectangle_annotation(pdf, coordinates)
```

### ✅ Do: Rasterize and Draw Pixels
```python
# GOOD - permanent pixel-level redaction
image = pdf_page_to_image(pdf, page_num)
draw_black_rectangle_on_pixels(image, coordinates)
new_pdf = image_to_pdf(image)
```

---

# 9. TESTING STRATEGY

## 🧪 Test Coverage Requirements

**Target:** >80% code coverage

### Backend Tests

#### Unit Tests

```python
# test_redaction_service.py

def test_percentage_to_pixel_conversion():
    """Verify coordinate system accuracy"""
    assert to_pixels(50, 800) == 400
    assert to_pixels(25, 600) == 150

def test_apply_redaction_to_image():
    """Verify rectangle drawn at correct pixel coordinates"""
    image = Image.new('RGB', (800, 600), 'white')
    redaction = Redaction(
        left_percent=25, top_percent=25,
        right_percent=75, bottom_percent=75
    )

    result = apply_redaction(image, redaction)

    # Check pixel at center of redaction is black
    center_pixel = result.getpixel((400, 300))
    assert center_pixel == (0, 0, 0)

def test_redacted_pdf_text_extraction():
    """Verify redacted areas contain no extractable text"""
    redacted_pdf = export_redacted_document(doc_id, redactions)

    text = extract_text_from_pdf(redacted_pdf)

    assert sensitive_data not in text

def test_original_file_unchanged():
    """Verify original file integrity after redaction"""
    original_hash_before = hash_file(original_path)

    export_redacted_document(doc_id, redactions)

    original_hash_after = hash_file(original_path)
    assert original_hash_before == original_hash_after
```

#### Integration Tests

```python
# test_redaction_pipeline.py

async def test_full_export_pipeline():
    """Test complete export from start to finish"""
    # Create document
    doc = await create_test_document()

    # Add redactions
    redaction1 = await create_redaction(doc.id, page=1, coords={...})
    redaction2 = await create_redaction(doc.id, page=2, coords={...})

    # Export
    redacted_version = await export_redacted_document(doc.id)

    # Verify
    assert os.path.exists(redacted_version.file_path)
    assert redacted_version.redaction_count == 2

    # Verify text unrecoverable
    text = extract_text(redacted_version.file_path)
    assert sensitive_text not in text
```

### Frontend Tests

#### Component Tests

```typescript
// RedactionCanvas.test.tsx

test('converts screen coordinates to percentages', () => {
  const canvas = { width: 800, height: 600 };
  const click = { x: 200, y: 150 };

  const percent = toPercentage(click, canvas);

  expect(percent.x).toBe(25);  // 200/800 * 100
  expect(percent.y).toBe(25);  // 150/600 * 100
});

test('draws redaction box on mouse drag', () => {
  const { container } = render(<RedactionCanvas {...props} />);
  const canvas = container.querySelector('canvas');

  fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
  fireEvent.mouseMove(canvas, { clientX: 300, clientY: 200 });
  fireEvent.mouseUp(canvas, { clientX: 300, clientY: 200 });

  expect(mockOnRedactionCreate).toHaveBeenCalledWith({
    pageNumber: 1,
    left: expect.any(Number),
    top: expect.any(Number),
    right: expect.any(Number),
    bottom: expect.any(Number),
  });
});
```

#### Integration Tests

```typescript
// VersionsTool.test.tsx

test('displays both original and redacted versions', () => {
  const versions = [
    { id: 'v1', isRedacted: false, ... },
    { id: 'v1-redacted', isRedacted: true, redactionCount: 5, ... },
  ];

  const { getByText } = render(<VersionsTool versions={versions} />);

  expect(getByText('Original')).toBeInTheDocument();
  expect(getByText('Redacted (5)')).toBeInTheDocument();
});
```

### Security Tests

```python
# test_security.py

def test_cannot_extract_text_from_redacted_areas():
    """Verify data is truly unrecoverable"""
    # Export redacted version
    redacted_pdf = export_with_redactions(doc_id, redactions)

    # Try multiple extraction methods
    text_pypdf = extract_with_pypdf(redacted_pdf)
    text_pdfminer = extract_with_pdfminer(redacted_pdf)
    text_ocr = extract_with_ocr(redacted_pdf)

    # All should fail to recover redacted text
    assert sensitive_text not in text_pypdf
    assert sensitive_text not in text_pdfminer
    assert sensitive_text not in text_ocr

def test_permissions_enforced():
    """Verify only authorized users can create redactions"""
    # User without permission
    unauthorized_user = create_user(role='viewer')

    with pytest.raises(PermissionDenied):
        create_redaction(doc_id, redaction, user=unauthorized_user)
```

### Performance Tests

```python
# test_performance.py

def test_export_speed_10_pages():
    """10-page document should export in <30 seconds"""
    import time

    doc = create_test_document(pages=10)
    redactions = create_random_redactions(doc.id, count=20)

    start = time.time()
    export_redacted_document(doc.id, redactions)
    duration = time.time() - start

    assert duration < 30.0

def test_canvas_rendering_performance():
    """Canvas should maintain 60 FPS"""
    # Measure frame time
    frame_times = measure_canvas_performance(redaction_count=50)

    avg_frame_time = sum(frame_times) / len(frame_times)
    fps = 1000 / avg_frame_time

    assert fps >= 60
```

---

# 10. SECURITY & PERMISSIONS

## 🔐 Permission Model

### Permissions

```python
# New permissions for redaction features
PERMISSION_REDACTION_CREATE = "redaction:create"
PERMISSION_REDACTION_VIEW = "redaction:view"
PERMISSION_REDACTION_DELETE = "redaction:delete"
PERMISSION_REDACTION_EXPORT = "redaction:export"
PERMISSION_DOCUMENT_DOWNLOAD_ORIGINAL = "document:download:original"
PERMISSION_DOCUMENT_DOWNLOAD_REDACTED = "document:download:redacted"
```

### Role Mappings

```python
ADMIN_ROLE = {
    'permissions': [
        'redaction:create',
        'redaction:view',
        'redaction:delete',
        'redaction:export',
        'document:download:original',
        'document:download:redacted',
    ]
}

LEGAL_ROLE = {
    'permissions': [
        'redaction:create',
        'redaction:view',
        'redaction:delete',
        'redaction:export',
        'document:download:redacted',  # Can only download redacted
    ]
}

USER_ROLE = {
    'permissions': [
        'redaction:view',
        'document:download:redacted',  # Can only view/download redacted
    ]
}
```

### Access Control Rules

1. **Redaction Creation**
   - Only users with `redaction:create` can add/edit redactions
   - Must have access to the document

2. **Export**
   - Only users with `redaction:export` can generate redacted versions
   - Exports are queued and tracked

3. **Download Original**
   - Requires `document:download:original` permission
   - Returns unredacted file

4. **Download Redacted**
   - Requires `document:download:redacted` OR `redaction:view`
   - Returns redacted file with pixels destroyed

5. **Audit Logging**
   - All redaction operations logged
   - Include user, timestamp, action, document

## 🛡️ Security Verification Checklist

### Data Protection
- [ ] Redacted PDFs are rasterized (no text layer)
- [ ] Redactions cannot be removed with PDF editors
- [ ] Text extraction tools fail on redacted areas
- [ ] OCR cannot recover redacted text
- [ ] No data leakage in PDF metadata
- [ ] Original files never modified

### Access Control
- [ ] Permission checks on all API endpoints
- [ ] Document-level ACLs enforced
- [ ] Rate limiting on export endpoints
- [ ] Prevent unauthorized file access

### Audit & Compliance
- [ ] All operations logged
- [ ] Audit trail is tamper-proof
- [ ] Compliance reporting available
- [ ] GDPR/HIPAA considerations documented

---

# 11. DEPLOYMENT GUIDE

## 🚀 Pre-Deployment Checklist

### Environment Setup
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] File storage directories created
- [ ] Permissions set correctly

### Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Security tests passing
- [ ] Performance benchmarks met
- [ ] Manual QA complete

### Documentation
- [ ] API documentation published
- [ ] User guide written
- [ ] Developer guide complete
- [ ] Deployment runbook ready

## 📦 Deployment Steps

### 1. Database Migration

```bash
# Run migrations
cd pie-docs-backend
python run_migrations.py

# Verify tables created
psql -d piedocs -c "\d redactions"
psql -d piedocs -c "\d document_redacted_versions"
```

### 2. Backend Deployment

```bash
# Install dependencies
pip install -r requirements.txt

# Install system packages
sudo apt-get update
sudo apt-get install poppler-utils

# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Deployment

```bash
# Build frontend
cd pie-docs-frontend
npm install
npm run build

# Deploy to production
# (copy build files to web server)
```

### 4. Smoke Tests

```bash
# Test API endpoints
curl http://localhost:8000/api/health

# Test redaction creation
curl -X POST http://localhost:8000/api/documents/{id}/redactions \
  -H "Content-Type: application/json" \
  -d '{"pageNumber": 1, "left": 25, "top": 25, "right": 75, "bottom": 75}'

# Test export
curl -X POST http://localhost:8000/api/documents/{id}/export-redacted
```

## 📊 Monitoring

### Metrics to Track
- Redaction creation count
- Export success/failure rate
- Export duration (by page count)
- Storage usage for redacted versions
- API error rates

### Alerts
- Export failures
- Long export times (>5 min)
- High error rates
- Storage approaching capacity

---

# 12. PROGRESS TRACKER

## 📊 Overall Progress

**Total Tasks:** 23
**Completed:** 0
**In Progress:** 0
**Pending:** 23

**Progress:** 0% ████████████████████ 100%

---

## ✅ Phase 1: Database & Backend Foundation (0/4)

- [ ] Create redaction tables migration
- [ ] Implement Redaction Pydantic models
- [ ] Create CRUD API endpoints for redactions
- [ ] Set up file storage for redacted versions

**Status:** ⏳ Not Started

---

## ✅ Phase 2: Image Processing Core (0/5)

- [ ] Install PIL/Pillow and pdf2image libraries
- [ ] Implement PDF to Image conversion service
- [ ] Implement redaction rectangle drawing on images
- [ ] Implement Image to PDF conversion pipeline
- [ ] Create complete redaction export service

**Status:** ⏳ Not Started

---

## ✅ Phase 3: Frontend - Redaction UI (0/5)

- [ ] Create RedactionsTool React component
- [ ] Implement RedactionCanvas with mouse drawing
- [ ] Add redaction list and management UI
- [ ] Implement percentage-based coordinate system
- [ ] Connect frontend to backend redaction APIs

**Status:** ⏳ Not Started

---

## ✅ Phase 4: Version Management (0/3)

- [ ] Enhance VersionsTool to show Original and Redacted versions
- [ ] Add download buttons for both original and redacted versions
- [ ] Create version comparison modal component

**Status:** ⏳ Not Started

---

## ✅ Phase 5: Integration & Polish (0/3)

- [ ] Integrate redactions into document viewer
- [ ] Implement export progress tracking
- [ ] Add audit logging for redaction operations

**Status:** ⏳ Not Started

---

## ✅ Phase 6: Testing & Security (0/3)

- [ ] Write unit tests for redaction service
- [ ] Create integration tests for export pipeline
- [ ] Perform security audit and verify pixel-level data destruction

**Status:** ⏳ Not Started

---

## 🎯 Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test Coverage | >80% | 0% | ⏳ |
| Security Audit | Pass | Pending | ⏳ |
| Export Speed (10 pages) | <30 sec | N/A | ⏳ |
| Export Speed (50 pages) | <2 min | N/A | ⏳ |
| Canvas FPS | 60 FPS | N/A | ⏳ |

---

# 13. REFERENCE MATERIALS

## 📚 Mayan EDMS Study

### Key Files to Reference

1. **Transformation Architecture**
   - `mayan/apps/converter/transformations.py`
   - `mayan/apps/converter/classes.py`
   - `mayan/apps/converter/layers.py`

2. **Redaction Implementation**
   - `mayan/apps/redactions/transformations.py`
   - `mayan/apps/redactions/layers.py`

3. **Export Pipeline**
   - `mayan/apps/documents/models/document_version_page_models.py`
   - `mayan/apps/documents/models/document_version_models.py`

### Key Learnings from Mayan

1. **Store transformations as metadata, not file modifications**
   - Original files remain untouched
   - Transformations applied at render time

2. **Use percentage-based coordinates**
   - Resolution independent
   - Works across different DPI settings

3. **Rasterize before export**
   - Convert to images
   - Apply transformations
   - Convert back to PDF
   - Ensures permanence

4. **Maintain separate download paths**
   - Original file download
   - Transformed/exported download
   - Clear separation in UI

## 🔗 External Resources

### Libraries
- **Pillow (PIL):** https://pillow.readthedocs.io/
- **pdf2image:** https://github.com/Belval/pdf2image
- **img2pdf:** https://gitlab.mister-muffin.de/josch/img2pdf
- **react-pdf:** https://react-pdf.org/

### Standards
- **PDF Specification:** https://www.adobe.com/devnet/pdf/pdf_reference.html
- **GDPR Compliance:** https://gdpr.eu/
- **HIPAA Guidelines:** https://www.hhs.gov/hipaa/

---

## 📝 Document Maintenance

### Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-06 | Initial creation | Development Team |

### Review Schedule

- **Weekly:** During implementation (update progress tracker)
- **Monthly:** After launch (update based on feedback)
- **Quarterly:** Major reviews and updates

### Update Protocol

1. Make changes to relevant sections
2. Update version number
3. Add entry to version history
4. Notify team of changes

---

## 🎓 Training Resources

### For Developers

**Week 1:** Read this guide sections 1-5
**Week 2:** Set up environment and complete Phase 1
**Week 3:** Build Phase 2 (image processing)
**Week 4:** Build Phase 3 (frontend UI)

### For Users

**User Guide Outline:**
1. Introduction to Redactions
2. Creating Redactions
3. Exporting Redacted Documents
4. Version Management
5. FAQ

---

## ✉️ Support & Questions

### Common Questions

**Q: Where do I start?**
A: Read sections 1-3, then begin Phase 1 tasks

**Q: How do coordinates work?**
A: See section 3 → Coordinate System

**Q: What's the export flow?**
A: See section 3 → Data Flow → Export Flow

**Q: Is text really unrecoverable?**
A: Yes! See section 9 → Security Tests

**Q: How do I track progress?**
A: Update section 12 → Progress Tracker as you complete tasks

---

## 🏁 Getting Started NOW

### Immediate Next Steps

1. **Today:**
   - Review this entire document (2-3 hours)
   - Set up development environment
   - Clone/pull latest code

2. **Tomorrow:**
   - Start Phase 1, Task 1.1 (database migration)
   - Create feature branch
   - Begin implementation

3. **This Week:**
   - Complete Phase 1 (all 4 tasks)
   - Update progress tracker
   - Demo to team

---

**Ready to build? Start with Phase 1, Task 1.1! 🚀**

---

*Last Updated: 2025-10-06*
*Document Version: 1.0*
*Status: Planning Phase - Ready for Implementation*
