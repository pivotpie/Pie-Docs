# Backend Dependencies Setup

## Python Dependencies

Install all Python dependencies:
```bash
pip install -r requirements.txt
```

## System Dependencies

### Poppler (Required for PDF to Image Conversion)

Poppler is required for the AI classification feature to convert PDF documents to images before sending to OpenAI Vision API.

#### Windows Installation:

**Option 1: Using Chocolatey (Recommended - requires admin)**
```powershell
# Run in Administrator PowerShell
choco install poppler -y
```

**Option 2: Manual Installation**
1. Download Poppler for Windows: https://github.com/oschwartz10612/poppler-windows/releases/
2. Extract to `C:\poppler` (or your preferred location)
3. Add to system PATH:
   - Open System Properties → Environment Variables
   - Edit "Path" variable
   - Add: `C:\poppler\Library\bin`
4. Restart your terminal/IDE

**Option 3: Using Conda**
```bash
conda install -c conda-forge poppler
```

#### Linux Installation:

```bash
# Ubuntu/Debian
sudo apt-get install poppler-utils

# Fedora
sudo dnf install poppler-utils

# Arch
sudo pacman -S poppler
```

#### macOS Installation:

```bash
brew install poppler
```

### Verify Installation

After installing Poppler, verify it's available:
```bash
# Windows
where pdftoppm

# Linux/macOS
which pdftoppm
```

You should see the path to the `pdftoppm` executable.

## Restart Backend Server

After installing all dependencies, restart the backend server for changes to take effect:
```bash
cd pie-docs-backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Testing AI Classification

Once all dependencies are installed:
1. Upload a PDF document
2. Click "Start AI Classification"
3. Check browser console and backend logs for successful classification

The logs should show:
- ✅ "Converting PDF to image for vision API..."
- ✅ "PDF converted to PNG successfully"
- ✅ OpenAI API call with image data
- ✅ Classification results with confidence score
