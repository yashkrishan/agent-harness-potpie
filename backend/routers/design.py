from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Project, Phase, SystemDesign, Task
from pydantic import BaseModel
from typing import Optional
import os
import json

router = APIRouter()

class DesignUpdate(BaseModel):
    architecture: Optional[str] = None
    sequence_diagram: Optional[str] = None
    api_structure: Optional[dict] = None
    db_changes: Optional[dict] = None
    data_flow: Optional[str] = None
    approved: Optional[bool] = None

# Hardcoded design data for Azimutt keyboard shortcuts demo
DEMO_DESIGNS = {
    1: {  # Phase 1 - Zoom Shortcuts & Conf.elm Updates
        "architecture": """# Architecture: Zoom Shortcuts & Configuration

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Browser Layer"
        KeyEvent[Keyboard Event<br/>=, -, 0]
    end

    subgraph "TypeScript Bridge"
        HotkeyTS[Hotkey.ts<br/>Key Matcher]
        PortTS[Ports.ts<br/>Elm Interop]
    end

    subgraph "Elm Application"
        Conf[Conf.elm<br/>Hotkey Definitions]
        Hotkey[Hotkey.elm<br/>Message Handlers]
        Canvas[Canvas.elm<br/>Zoom Functions]
    end

    subgraph "State"
        Model[Model<br/>canvas.zoom: Float]
    end

    KeyEvent -->|keydown| HotkeyTS
    HotkeyTS -->|match| Conf
    HotkeyTS -->|port| PortTS
    PortTS -->|Msg| Hotkey
    Hotkey -->|ZoomIn/ZoomOut| Canvas
    Canvas -->|update| Model

    style KeyEvent fill:#3b82f6,stroke:#1e40af,color:#fff
    style HotkeyTS fill:#10b981,stroke:#059669,color:#fff
    style Conf fill:#f59e0b,stroke:#d97706,color:#fff
    style Hotkey fill:#f59e0b,stroke:#d97706,color:#fff
    style Canvas fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Model fill:#ef4444,stroke:#dc2626,color:#fff
```

## Component Diagram

```mermaid
classDiagram
    class Conf {
        +hotkeys: Dict String String
        +canvas.zoom.min: Float
        +canvas.zoom.max: Float
        +canvas.zoom.speed: Float
    }

    class HotkeyMsg {
        <<enumeration>>
        ZoomIn
        ZoomOut
        ZoomReset
    }

    class Hotkey {
        +handleHotkey(model, key) Cmd Msg
        +hotkeyZoomIn(canvas) Canvas
        +hotkeyZoomOut(canvas) Canvas
    }

    class Canvas {
        +zoom: Float
        +position: Position
        +performZoom(delta, center) Canvas
        +zoomCanvas(zoom) Canvas
    }

    Conf --> Hotkey : provides mappings
    Hotkey --> HotkeyMsg : dispatches
    Hotkey --> Canvas : updates
```

## Components

1. **Conf.elm - Hotkey Configuration**
   - Central hotkey definitions
   - Zoom bounds (0.001 to 5)
   - Key-to-action mappings

2. **Hotkey.elm - Message Handlers**
   - handleHotkey dispatcher
   - Zoom increment logic (10%)
   - Key matching and routing

3. **Canvas.elm - Zoom Implementation**
   - performZoom with clamping
   - Zoom center calculations
   - State updates

## Technology Stack
- Elm 0.19 (The Elm Architecture)
- TypeScript for browser bridge
- Ports for JS interop
- Vite for bundling

## File Structure
```
frontend/src/
  Conf.elm           # Hotkey definitions
  PagesComponents/Organization_/Project_/Updates/
    Hotkey.elm       # Hotkey handlers
    Canvas.elm       # Zoom functions
```
""",
        "sequence_diagram": """sequenceDiagram
    participant Browser
    participant Hotkey.ts
    participant Ports
    participant Hotkey.elm
    participant Canvas.elm
    participant Model

    Browser->>Hotkey.ts: keydown event (=)
    Hotkey.ts->>Hotkey.ts: matchHotkey("=")
    Hotkey.ts->>Ports: sendHotkey("zoom-in")
    Ports->>Hotkey.elm: Hotkey "zoom-in"
    Hotkey.elm->>Hotkey.elm: handleHotkey model "zoom-in"
    Hotkey.elm->>Canvas.elm: hotkeyZoomIn canvas
    Canvas.elm->>Canvas.elm: performZoom(zoom * 1.1)
    Canvas.elm->>Canvas.elm: clamp(0.001, 5)
    Canvas.elm->>Model: update canvas.zoom
    Model-->>Browser: re-render view""",
        "api_structure": {
            "endpoints": []
        },
        "db_changes": {
            "tables": []
        },
        "data_flow": """# Data Flow: Zoom Shortcuts

1. **Key Event Capture**
   - Browser captures keydown event
   - TypeScript Hotkey.ts matches against Conf.elm definitions
   - Prevents default browser behavior

2. **Message Dispatch**
   - Matched key sent via Elm port
   - Hotkey.elm receives and routes message
   - Appropriate handler invoked

3. **State Update**
   - Canvas.elm calculates new zoom level
   - 10% increment/decrement applied
   - Value clamped to valid range (0.001-5)
   - Model updated with new zoom

4. **View Re-render**
   - Elm runtime detects model change
   - View function called with new model
   - Canvas rendered at new zoom level"""
    },
    2: {  # Phase 2 - Canvas Panning
        "architecture": """# Architecture: Canvas Panning with Shift+Arrow Keys

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Browser Layer"
        KeyEvent[Keyboard Event<br/>Shift+Arrow]
    end

    subgraph "TypeScript Bridge"
        HotkeyTS[Hotkey.ts<br/>Modifier Detection]
    end

    subgraph "Elm Application"
        Conf[Conf.elm<br/>pan-* Definitions]
        Hotkey[Hotkey.elm<br/>Pan Handlers]
        Canvas[Canvas.elm<br/>Pan Functions]
    end

    subgraph "State"
        Model[Model<br/>canvas.position: Position]
    end

    KeyEvent -->|Shift+Arrow| HotkeyTS
    HotkeyTS -->|"pan-up/down/left/right"| Conf
    HotkeyTS -->|port| Hotkey
    Hotkey -->|PanCanvas Delta| Canvas
    Canvas -->|updatePosition| Model

    style KeyEvent fill:#3b82f6,stroke:#1e40af,color:#fff
    style HotkeyTS fill:#10b981,stroke:#059669,color:#fff
    style Conf fill:#f59e0b,stroke:#d97706,color:#fff
    style Hotkey fill:#f59e0b,stroke:#d97706,color:#fff
    style Canvas fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style Model fill:#ef4444,stroke:#dc2626,color:#fff
```

## Component Diagram

```mermaid
classDiagram
    class Conf {
        +hotkeys: Dict String String
        +pan-up: "shift+arrowup"
        +pan-down: "shift+arrowdown"
        +pan-left: "shift+arrowleft"
        +pan-right: "shift+arrowright"
    }

    class Delta {
        +dx: Float
        +dy: Float
    }

    class Position {
        +left: Float
        +top: Float
    }

    class Hotkey {
        +handleHotkey(model, key) Cmd Msg
        +hotkeyPanUp(canvas) Canvas
        +hotkeyPanDown(canvas) Canvas
        +hotkeyPanLeft(canvas) Canvas
        +hotkeyPanRight(canvas) Canvas
    }

    class Canvas {
        +position: Position
        +panCanvas(delta) Canvas
    }

    Conf --> Hotkey : provides mappings
    Hotkey --> Delta : creates
    Hotkey --> Canvas : updates position
    Canvas --> Position : modifies
```

## Components

1. **Modifier Key Detection**
   - TypeScript detects Shift+Arrow combinations
   - Prevents conflict with table movement (Arrow only)
   - Sends appropriate pan-* message

2. **Pan Message Types**
   - PanUp: dy = -50px
   - PanDown: dy = +50px
   - PanLeft: dx = -50px
   - PanRight: dx = +50px

3. **Position Update**
   - Canvas.elm receives Delta
   - Adds to current position
   - No bounds clamping (infinite canvas)

## Pan Distance
- **50px per keypress** - balanced between speed and control
- Consistent with design tool conventions
- Smooth navigation without overshooting""",
        "sequence_diagram": """sequenceDiagram
    participant Browser
    participant Hotkey.ts
    participant Ports
    participant Hotkey.elm
    participant Canvas.elm
    participant Model

    Browser->>Hotkey.ts: keydown (Shift+ArrowUp)
    Hotkey.ts->>Hotkey.ts: detectModifiers(shift=true)
    Hotkey.ts->>Hotkey.ts: matchHotkey("shift+arrowup")
    Hotkey.ts->>Ports: sendHotkey("pan-up")
    Ports->>Hotkey.elm: Hotkey "pan-up"
    Hotkey.elm->>Hotkey.elm: handleHotkey "pan-up"
    Hotkey.elm->>Canvas.elm: hotkeyPanUp canvas
    Canvas.elm->>Canvas.elm: panCanvas {dx=0, dy=-50}
    Note over Canvas.elm: position.top -= 50
    Canvas.elm->>Model: update canvas.position
    Model-->>Browser: re-render (canvas scrolls up)""",
        "api_structure": {
            "endpoints": []
        },
        "db_changes": {
            "tables": []
        },
        "data_flow": """# Data Flow: Canvas Panning

1. **Modifier Key Detection**
   - Browser detects Shift key held
   - Arrow key press captured
   - TypeScript matches "shift+arrow*" pattern

2. **Message Routing**
   - Pan direction determined from arrow key
   - Appropriate pan-* message sent to Elm
   - Hotkey.elm routes to correct handler

3. **Position Calculation**
   - Delta created: {dx: 0, dy: ±50} or {dx: ±50, dy: 0}
   - Added to current canvas.position
   - No bounds checking (infinite canvas)

4. **Backward Compatibility**
   - Arrow keys without Shift still move tables
   - Existing table movement behavior preserved
   - Users can use both features"""
    },
    3: {  # Phase 3 - Tool & Feature Shortcuts
        "architecture": """# Architecture: Tool Switching & Feature Shortcuts

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Keyboard Shortcuts"
        VKey[v key<br/>Select Tool]
        DKey[Alt+d<br/>Drag Tool]
        AKey[Alt+a<br/>Arrange]
        TKey[t key<br/>Table List]
    end

    subgraph "Elm Application"
        Hotkey[Hotkey.elm<br/>Tool Handlers]
        Sidebar[DetailsSidebar.elm<br/>Toggle]
        Layout[Layout.elm<br/>Dagre]
    end

    subgraph "Model State"
        CursorMode[cursorMode<br/>Select|Drag]
        SidebarState[sidebar.show<br/>Bool]
        TablePositions[tables<br/>Positions]
    end

    VKey -->|tool-select| Hotkey
    DKey -->|tool-drag| Hotkey
    AKey -->|arrange-tables| Layout
    TKey -->|toggle-table-list| Sidebar

    Hotkey -->|setCursorMode| CursorMode
    Layout -->|autoLayout| TablePositions
    Sidebar -->|toggle| SidebarState

    style VKey fill:#3b82f6,stroke:#1e40af,color:#fff
    style DKey fill:#3b82f6,stroke:#1e40af,color:#fff
    style AKey fill:#10b981,stroke:#059669,color:#fff
    style TKey fill:#10b981,stroke:#059669,color:#fff
    style Hotkey fill:#f59e0b,stroke:#d97706,color:#fff
```

## Component Diagram

```mermaid
classDiagram
    class CursorMode {
        <<enumeration>>
        Select
        Drag
    }

    class Hotkey {
        +handleHotkey(model, key) Cmd Msg
        +hotkeySelectMode(model) Model
        +hotkeyDragMode(model) Model
        +hotkeyArrangeTables(model) Cmd Msg
        +hotkeyToggleTableList(model) Model
    }

    class DetailsSidebar {
        +Toggle: Msg
        +show: Bool
    }

    class Layout {
        +dagre(tables, relations) Positions
        +arrangeLayout(model) Cmd Msg
    }

    Hotkey --> CursorMode : sets
    Hotkey --> DetailsSidebar : sends Toggle
    Hotkey --> Layout : triggers arrange
```

## Shortcut Assignments

| Key | Action | Description |
|-----|--------|-------------|
| `v` | Select Tool | Industry standard (Figma, Sketch) |
| `Alt+d` | Drag Tool | Avoids conflict with potential 'd' shortcuts |
| `Alt+a` | Arrange | Auto-layout with Dagre algorithm |
| `t` | Table List | Toggle sidebar visibility |

## Design Decisions

1. **'v' for Select** - Follows industry convention
2. **Alt+modifier for tools** - Prevents accidental triggers
3. **Direct arrange action** - No menu, faster workflow
4. **Toggle behavior** - Consistent open/close pattern""",
        "sequence_diagram": """sequenceDiagram
    participant Browser
    participant Hotkey.ts
    participant Hotkey.elm
    participant Model
    participant Layout
    participant Sidebar

    Note over Browser: Tool Switching
    Browser->>Hotkey.ts: keydown (v)
    Hotkey.ts->>Hotkey.elm: "tool-select"
    Hotkey.elm->>Model: cursorMode = Select

    Browser->>Hotkey.ts: keydown (Alt+d)
    Hotkey.ts->>Hotkey.elm: "tool-drag"
    Hotkey.elm->>Model: cursorMode = Drag

    Note over Browser: Feature Shortcuts
    Browser->>Hotkey.ts: keydown (Alt+a)
    Hotkey.ts->>Hotkey.elm: "arrange-tables"
    Hotkey.elm->>Layout: arrangeTables(model)
    Layout->>Layout: dagre algorithm
    Layout->>Model: update table positions

    Browser->>Hotkey.ts: keydown (t)
    Hotkey.ts->>Hotkey.elm: "toggle-table-list"
    Hotkey.elm->>Sidebar: Toggle message
    Sidebar->>Model: sidebar.show = !show""",
        "api_structure": {
            "endpoints": []
        },
        "db_changes": {
            "tables": []
        },
        "data_flow": """# Data Flow: Tool & Feature Shortcuts

1. **Tool Selection (v, Alt+d)**
   - Key press detected
   - CursorMode enum updated
   - Canvas interaction behavior changes
   - Visual cursor indicator updates

2. **Auto-Arrange (Alt+a)**
   - Triggers Dagre layout algorithm
   - Calculates optimal table positions
   - Respects table relationships
   - Batch updates all positions

3. **Table List Toggle (t)**
   - Sends DetailsSidebar.Toggle message
   - Sidebar visibility flipped
   - Maintains panel state
   - Smooth transition animation

4. **Conflict Prevention**
   - Alt modifier prevents typing conflicts
   - Single keys only for common actions
   - Matches mental model from design tools"""
    },
    4: {  # Phase 4 - UI Updates & Documentation
        "architecture": """# Architecture: UI Updates & Documentation

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Help System"
        HelpModal[Help Modal<br/>? key]
        Tooltips[Button Tooltips<br/>Shortcut Hints]
    end

    subgraph "View Layer"
        Navbar[Navbar.elm<br/>Help Button]
        Controls[Controls.elm<br/>Zoom Buttons]
    end

    subgraph "Documentation"
        README[README.md<br/>Usage Guide]
        CHANGELOG[CHANGELOG.md<br/>v0.x.x]
    end

    HelpModal -->|shows| ShortcutList[All Shortcuts]
    Tooltips -->|displays| HintText["Zoom in (=)"]
    Navbar -->|opens| HelpModal
    Controls -->|hover| Tooltips

    style HelpModal fill:#3b82f6,stroke:#1e40af,color:#fff
    style Tooltips fill:#10b981,stroke:#059669,color:#fff
    style ShortcutList fill:#f59e0b,stroke:#d97706,color:#fff
```

## Component Diagram

```mermaid
classDiagram
    class HelpModal {
        +visible: Bool
        +shortcuts: List Shortcut
        +view() Html Msg
    }

    class Shortcut {
        +key: String
        +action: String
        +category: String
    }

    class Tooltip {
        +text: String
        +shortcut: Maybe String
        +position: TooltipPosition
    }

    class Controls {
        +zoomInButton() Html Msg
        +zoomOutButton() Html Msg
        +renderTooltip(Tooltip) Html Msg
    }

    HelpModal --> Shortcut : displays list
    Controls --> Tooltip : renders
```

## Help Modal Categories

| Category | Shortcuts |
|----------|-----------|
| **Navigation** | =, -, 0, Shift+Arrows |
| **Tools** | v, Alt+d |
| **Features** | Alt+a, t |
| **General** | ?, Esc |

## Tooltip Format

```
"Zoom in (=)"
"Zoom out (-)"
"Reset zoom (0)"
"Select tool (v)"
```

## Documentation Updates

1. **README.md** - Keyboard shortcuts section
2. **CHANGELOG.md** - Feature announcement
3. **In-app Help** - Comprehensive shortcut list""",
        "sequence_diagram": """sequenceDiagram
    participant User
    participant Navbar
    participant HelpModal
    participant Tooltip
    participant Controls

    Note over User: Discovering Shortcuts

    User->>Navbar: click Help button
    Navbar->>HelpModal: show()
    HelpModal->>HelpModal: render shortcut list
    HelpModal-->>User: display all shortcuts

    User->>HelpModal: press Esc
    HelpModal->>HelpModal: hide()

    User->>Controls: hover zoom-in button
    Controls->>Tooltip: showTooltip("Zoom in (=)")
    Tooltip-->>User: display hint

    User->>Controls: mouse leave
    Controls->>Tooltip: hide()

    Note over User: Using ? shortcut
    User->>HelpModal: press ? key
    HelpModal->>HelpModal: toggle visibility""",
        "api_structure": {
            "endpoints": []
        },
        "db_changes": {
            "tables": []
        },
        "data_flow": """# Data Flow: UI Updates & Documentation

1. **Help Modal**
   - Triggered by ? key or Help button
   - Renders categorized shortcut list
   - Dismissable with Esc key
   - Accessible keyboard navigation

2. **Tooltip System**
   - Hover triggers tooltip display
   - Format: "Action (shortcut)"
   - Positioned relative to button
   - Auto-hide on mouse leave

3. **Documentation**
   - README.md updated with shortcuts table
   - CHANGELOG.md documents new feature
   - Migration notes for existing users

4. **Discoverability**
   - Multiple discovery paths
   - Progressive disclosure
   - Consistent with OS conventions
   - Accessible to new users"""
    }
}

@router.post("/generate/{phase_id}")
async def generate_design(phase_id: int, db: Session = Depends(get_db)):
    phase = db.query(Phase).filter(Phase.id == phase_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    project = db.query(Project).filter(Project.id == phase.project_id).first()
    tasks = db.query(Task).filter(Task.phase_id == phase_id).order_by(Task.task_number).all()

    # Use hardcoded design for demo based on phase number
    design_data = DEMO_DESIGNS.get(phase.phase_number, DEMO_DESIGNS[1])

    # Create or update design
    design = db.query(SystemDesign).filter(SystemDesign.phase_id == phase_id).first()
    if not design:
        design = SystemDesign(
            project_id=project.id,
            phase_id=phase_id,
            architecture=design_data.get("architecture"),
            sequence_diagram=design_data.get("sequence_diagram"),
            api_structure=design_data.get("api_structure"),
            db_changes=design_data.get("db_changes"),
            data_flow=design_data.get("data_flow")
        )
        db.add(design)
    else:
        design.architecture = design_data.get("architecture")
        design.sequence_diagram = design_data.get("sequence_diagram")
        design.api_structure = design_data.get("api_structure")
        design.db_changes = design_data.get("db_changes")
        design.data_flow = design_data.get("data_flow")

    db.commit()
    db.refresh(design)

    return {
        "id": design.id,
        "architecture": design.architecture,
        "sequence_diagram": design.sequence_diagram,
        "api_structure": design.api_structure,
        "db_changes": design.db_changes,
        "data_flow": design.data_flow,
        "approved": design.approved
    }

@router.get("/phase/{phase_id}")
async def get_design(phase_id: int, db: Session = Depends(get_db)):
    design = db.query(SystemDesign).filter(SystemDesign.phase_id == phase_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    return {
        "id": design.id,
        "architecture": design.architecture,
        "sequence_diagram": design.sequence_diagram,
        "api_structure": design.api_structure,
        "db_changes": design.db_changes,
        "data_flow": design.data_flow,
        "approved": design.approved
    }

@router.patch("/{design_id}")
async def update_design(design_id: int, design_update: DesignUpdate, db: Session = Depends(get_db)):
    design = db.query(SystemDesign).filter(SystemDesign.id == design_id).first()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    if design_update.architecture is not None:
        design.architecture = design_update.architecture
    if design_update.sequence_diagram is not None:
        design.sequence_diagram = design_update.sequence_diagram
    if design_update.api_structure is not None:
        design.api_structure = design_update.api_structure
    if design_update.db_changes is not None:
        design.db_changes = design_update.db_changes
    if design_update.data_flow is not None:
        design.data_flow = design_update.data_flow
    if design_update.approved is not None:
        design.approved = design_update.approved
        if design_update.approved:
            project = db.query(Project).filter(Project.id == design.project_id).first()
            if project:
                project.status = "design_approved"
                db.commit()

    db.commit()
    db.refresh(design)

    return {
        "id": design.id,
        "approved": design.approved
    }

@router.post("/approve-all/{project_id}")
async def approve_all_designs(project_id: int, db: Session = Depends(get_db)):
    """Approve all designs for all phases in a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all phases for this project
    phases = db.query(Phase).filter(Phase.project_id == project_id).all()

    approved_count = 0
    for phase in phases:
        design = db.query(SystemDesign).filter(SystemDesign.phase_id == phase.id).first()
        if design and not design.approved:
            design.approved = True
            approved_count += 1

    if approved_count > 0:
        project.status = "design_approved"
        db.commit()

    return {
        "approved_count": approved_count,
        "total_phases": len(phases),
        "message": f"Approved {approved_count} design(s)"
    }
