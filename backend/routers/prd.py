from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Project, Plan
from pydantic import BaseModel
from typing import List, Dict, Optional
import os

router = APIRouter()

class PlanQuestion(BaseModel):
    question: str
    answer: Optional[str] = None

class PlanGenerate(BaseModel):
    questions: List[PlanQuestion]
    repo_analysis: Optional[Dict] = None

class PlanSectionApproval(BaseModel):
    section: str
    approved: bool

# Comprehensive Plan document for Azimutt keyboard shortcuts demo
COMPREHENSIVE_PLAN_DOCUMENT = """# Implementation Plan: Azimutt Keyboard Shortcuts (Issue #350)

## 1. Problem Statement

Azimutt users currently lack keyboard shortcuts for common canvas navigation operations, requiring mouse-based interactions for zooming, panning, and tool switching. This reduces productivity for power users who prefer keyboard-driven workflows.

**Requested Features:**

**Must Haves:**
- Zoom In/Out using `-` and `=` keys
- Pan Canvas using arrow keys

**Nice to Haves:**
- Arrange Tables shortcut (like formatting code)
- Switch between Select/Drag tools
- Open Table List shortcut

**Current State:**
- Zoom only via `Ctrl+Scroll` or UI buttons
- No keyboard panning (arrow keys move selected tables)
- Tool switching only via mouse clicks
- Table list only accessible via menu button

**Impact:**
- Slower navigation for keyboard-preferring users
- Inconsistent with industry-standard design tools (Figma, Sketch)
- Reduced accessibility for users with mouse limitations

## 2. Goal

Implement comprehensive keyboard shortcuts for canvas navigation and tool access, following industry conventions while maintaining backward compatibility with existing shortcuts.

**Success Metrics:**
- All 6 new shortcut categories implemented
- Zero regression in existing shortcuts
- Shortcuts discoverable via Help modal and tooltips
- Works across Chrome, Firefox, Safari, Edge

## 3. Clarifying Questions & Decisions

### Q1: Arrow Key Behavior Conflict

**Question:** Arrow keys are currently mapped to move selected tables. How should we handle canvas panning?

| Option | Description | Selected |
|--------|-------------|----------|
| A) Replace table movement | Arrow keys pan canvas; remove table movement | |
| **B) Use modifier key for panning** | `Shift+Arrow` for panning, keep current behavior | ✅ **SELECTED** |
| C) Context-aware | Pan when nothing selected, move when table selected | |

**Rationale:** Modifier key approach maintains backward compatibility and is consistent with design tool conventions.

---

### Q2: Zoom Key Mapping

**Question:** Which keys should control zoom?

| Option | Description | Selected |
|--------|-------------|----------|
| A) `-` for out, `=` for in | As suggested in issue | |
| B) `-` for out, `+` for in | More intuitive symbols | |
| **C) `-` for out, `=`/`+` both for in** | Maximum flexibility | ✅ **SELECTED** |

**Rationale:** Supporting both `=` and `+` (Shift+=) provides the best user experience across keyboard layouts.

---

### Q3: Zoom Increment Amount

**Question:** What zoom increment should keyboard shortcuts use?

| Option | Description | Selected |
|--------|-------------|----------|
| **A) 10% increments** | Same as UI buttons | ✅ **SELECTED** |
| B) 25% increments | Larger jumps | |
| C) 5% increments | Finer control | |

**Rationale:** Consistency with existing button behavior provides predictable UX.

---

### Q4: Canvas Pan Speed

**Question:** How many pixels should each arrow key press pan?

| Option | Description | Selected |
|--------|-------------|----------|
| **A) 50px per keypress** | Noticeable but controlled | ✅ **SELECTED** |
| B) 100px per keypress | Faster navigation | |
| C) 10px (grid-aligned) | Match table movement | |

**Rationale:** 50px provides a good balance between speed and control.

---

### Q5: Arrange Tables Shortcut

**Question:** How should the arrange tables shortcut work?

| Option | Description | Selected |
|--------|-------------|----------|
| A) Opens dropdown menu | `a` opens layout selection | |
| **B) Direct trigger with default** | `Alt+a` applies Dagre layout | ✅ **SELECTED** |
| C) Skip for now | Focus on must-haves | |

**Rationale:** Direct trigger with Alt modifier avoids conflicts and provides quick access.

---

### Q6: Select/Drag Tool Toggle

**Question:** What shortcuts for tool switching?

| Option | Description | Selected |
|--------|-------------|----------|
| **A) `v` for select, `Alt+d` for drag** | Industry standard (Figma-like) | ✅ **SELECTED** |
| B) Space to toggle | Hold space for drag | |
| C) Number keys | 1=select, 2=drag | |

**Rationale:** `v` is industry standard. Using `Alt+d` avoids conflict with `d` key (if used elsewhere).

---

### Q7: Table List Shortcut

**Question:** What shortcut for opening the table list?

| Option | Description | Selected |
|--------|-------------|----------|
| **A) `t` key** | `t` for "table list" | ✅ **SELECTED** |
| B) `l` key | `l` for "list" | |
| C) `Tab` key | Toggle sidebar | |

**Rationale:** `t` provides intuitive mnemonic and doesn't conflict with existing shortcuts.

---

### Q8: Discoverability

**Question:** How should new shortcuts be communicated to users?

| Option | Description | Selected |
|--------|-------------|----------|
| A) Help dialog only | Add to existing `?` help | |
| B) Button tooltips only | Show in hover tooltips | |
| **C) Both** | Maximum discoverability | ✅ **SELECTED** |

**Rationale:** Both methods ensure users can discover shortcuts whether exploring UI or seeking help.

## 4. Scope

### In Scope

**Core Functionality:**
- Zoom in/out keyboard shortcuts (`=`/`+`/`-`)
- Canvas panning with `Shift+Arrow` keys
- Arrange tables shortcut (`Alt+a`)
- Tool switching (`v` for select, `Alt+d` for drag)
- Table list toggle (`t`)
- Help modal updates
- Button tooltip updates

**Technical Components:**
- Hotkey definitions in `Conf.elm`
- Handlers in `Hotkey.elm`
- New `PanCanvas` message type
- `panCanvas` function in `Canvas.elm`
- Updated `Help.elm` shortcuts section
- Updated `Commands.elm` tooltips

### Out of Scope

- Custom key binding configuration
- Keyboard shortcut preferences/settings
- Touch/gesture controls
- Gamepad support

## 5. Technical Architecture

**Technology Stack:**
- Language: Elm
- Framework: Elm Architecture (TEA)
- Hotkey System: TypeScript event listener + Elm ports
- Testing: Elm Test

**Module Structure:**
```
frontend/src/
├── Conf.elm                    (MODIFY - add hotkey definitions)
├── PagesComponents/Organization_/Project_/
│   ├── Models.elm              (MODIFY - add PanCanvas Msg)
│   ├── Updates.elm             (MODIFY - add handler)
│   ├── Updates/
│   │   ├── Hotkey.elm          (MODIFY - add case handlers)
│   │   └── Canvas.elm          (MODIFY - add panCanvas)
│   └── Views/
│       ├── Modals/Help.elm     (MODIFY - add shortcuts)
│       └── Commands.elm        (MODIFY - add tooltips)
```

## 6. Existing Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `/` | Open search |
| `n` | Open notes |
| `m` | Create memo |
| `c` | Collapse element |
| `s` | Show element |
| `h`, `Backspace`, `Delete` | Hide element |
| `↑↓←→` | Move selected tables |
| `Ctrl+0` | Reset zoom to 100% |
| `Ctrl+z` | Undo |
| `?` | Open help |

## 7. Implementation Phases

**Phase 1: Core Infrastructure Setup**
- Analyze current hotkey system architecture
- Identify integration points
- Plan new Msg types

**Phase 2: Zoom Shortcuts (Must Have)**
- Add `-`, `=`, `+` hotkey definitions
- Implement zoom handlers
- Reuse existing `zoomCanvas` function

**Phase 3: Canvas Panning (Must Have)**
- Add `Shift+Arrow` hotkey definitions
- Create `PanCanvas` message type
- Implement `panCanvas` function

**Phase 4: Nice-to-Have Features**
- Arrange tables shortcut (`Alt+a`)
- Tool switching (`v`, `Alt+d`)
- Table list toggle (`t`)

**Phase 5: UI Enhancements**
- Update Help modal with all shortcuts
- Add shortcut hints to button tooltips

**Phase 6: Testing & Documentation**
- Write Elm unit tests
- Cross-browser testing
- Update CHANGELOG

## 8. Acceptance Criteria

**AC-1: Zoom Shortcuts**
- ✅ `=` and `+` keys zoom in by 10%
- ✅ `-` key zooms out by 10%
- ✅ Zoom respects min/max limits
- ✅ Works with undo/redo

**AC-2: Canvas Panning**
- ✅ `Shift+↑↓←→` pans canvas by 50px
- ✅ Original arrow key behavior preserved
- ✅ Works at any zoom level

**AC-3: Tool Shortcuts**
- ✅ `v` switches to Select mode
- ✅ `Alt+d` switches to Drag mode
- ✅ Current mode visually indicated

**AC-4: Discoverability**
- ✅ All shortcuts in Help modal
- ✅ Tooltips show shortcuts
- ✅ No browser shortcut conflicts

## 9. Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/Conf.elm` | Add 9 hotkey definitions |
| `frontend/src/.../Updates/Hotkey.elm` | Add 9 case handlers |
| `frontend/src/.../Updates/Canvas.elm` | Add panCanvas function |
| `frontend/src/.../Models.elm` | Add PanCanvas Msg |
| `frontend/src/.../Views/Modals/Help.elm` | Add 7 shortcut entries |
| `frontend/src/.../Views/Commands.elm` | Update 6 tooltips |
| `CHANGELOG.md` | Add feature entries |
"""

@router.post("/generate")
async def generate_plan(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use comprehensive Plan document for demo
    plan_document = COMPREHENSIVE_PLAN_DOCUMENT
    
    # Create or update Plan
    plan = db.query(Plan).filter(Plan.project_id == project_id).order_by(Plan.id.desc()).first()
    if not plan:
        plan = Plan(project_id=project_id)
        db.add(plan)
    
    plan.plan_document = plan_document
    plan.questions = []  # No questions needed
    plan.answers = {}  # No answers needed
    db.commit()
    
    project.status = "plan_generated"
    db.commit()
    
    return {
        "plan_id": plan.id,
        "plan_document": plan_document
    }

@router.get("/{project_id}")
async def get_plan(project_id: int, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.project_id == project_id).order_by(Plan.id.desc()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {
        "id": plan.id,
        "questions": plan.questions or [],
        "answers": plan.answers or {},
        "plan_document": plan.plan_document
    }

@router.post("/approve-section")
async def approve_section(project_id: int, approval: PlanSectionApproval, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.project_id == project_id).order_by(Plan.id.desc()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Store section approvals
    if not plan.answers:
        plan.answers = {}
    
    plan.answers[f"section_{approval.section}_approved"] = approval.approved
    db.commit()
    
    return {"approved": approval.approved, "section": approval.section}
