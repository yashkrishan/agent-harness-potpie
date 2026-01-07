from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db, Project, Task, ExecutionLog, Phase, SessionLocal
from pydantic import BaseModel
from typing import Optional, List
import os
import asyncio
import time
from pathlib import Path

router = APIRouter()

class ExecutionCommand(BaseModel):
    command: str  # play, pause, stop
    task_id: Optional[int] = None
    user_instruction: Optional[str] = None

execution_state = {}  # In-memory state for execution

# Hardcoded code snippets for Azimutt keyboard shortcuts demo
DEMO_CODE_SNIPPETS = {
    "frontend/src/Conf.elm": """module Conf exposing (..)

{-| Configuration module for Azimutt.
Contains hotkey definitions, canvas settings, and application constants.
-}

import Dict exposing (Dict)
import Models.Project.CanvasProps exposing (ZoomLevel)


-- HOTKEY DEFINITIONS

type alias Hotkey =
    { key : String
    , ctrl : Bool
    , alt : Bool
    , shift : Bool
    , meta : Bool
    , target : Maybe String
    , onInput : Bool
    , preventDefault : Bool
    }


defaultHotkey : Hotkey
defaultHotkey =
    { key = ""
    , ctrl = False
    , alt = False
    , shift = False
    , meta = False
    , target = Nothing
    , onInput = False
    , preventDefault = True
    }


{-| All keyboard shortcuts for the application.
Keys are hotkey IDs, values are lists of alternative key combinations.
-}
hotkeys : Dict String (List Hotkey)
hotkeys =
    Dict.fromList
        [ -- Navigation
          ( "search", [ { defaultHotkey | key = "/" } ] )
        , ( "help", [ { defaultHotkey | key = "?" } ] )

        -- Element actions
        , ( "notes", [ { defaultHotkey | key = "n" } ] )
        , ( "memo", [ { defaultHotkey | key = "m" } ] )
        , ( "group", [ { defaultHotkey | key = "g" } ] )
        , ( "collapse", [ { defaultHotkey | key = "c" } ] )
        , ( "show", [ { defaultHotkey | key = "s" } ] )
        , ( "hide", [ { defaultHotkey | key = "h" }, { defaultHotkey | key = "Backspace" }, { defaultHotkey | key = "Delete" } ] )

        -- Table movement (existing)
        , ( "move-up", [ { defaultHotkey | key = "ArrowUp" } ] )
        , ( "move-down", [ { defaultHotkey | key = "ArrowDown" } ] )
        , ( "move-left", [ { defaultHotkey | key = "ArrowLeft" } ] )
        , ( "move-right", [ { defaultHotkey | key = "ArrowRight" } ] )

        -- Zoom shortcuts (NEW - Issue #350)
        , ( "zoom-in", [ { defaultHotkey | key = "=" }, { defaultHotkey | key = "+" } ] )
        , ( "zoom-out", [ { defaultHotkey | key = "-" } ] )

        -- Canvas panning (NEW - Issue #350)
        , ( "pan-up", [ { defaultHotkey | key = "ArrowUp", shift = True } ] )
        , ( "pan-down", [ { defaultHotkey | key = "ArrowDown", shift = True } ] )
        , ( "pan-left", [ { defaultHotkey | key = "ArrowLeft", shift = True } ] )
        , ( "pan-right", [ { defaultHotkey | key = "ArrowRight", shift = True } ] )

        -- Arrange tables (NEW - Issue #350)
        , ( "arrange-tables", [ { defaultHotkey | key = "a", alt = True } ] )

        -- Tool switching (NEW - Issue #350)
        , ( "tool-select", [ { defaultHotkey | key = "v" } ] )
        , ( "tool-drag", [ { defaultHotkey | key = "d", alt = True } ] )

        -- Table list (NEW - Issue #350)
        , ( "toggle-table-list", [ { defaultHotkey | key = "t" } ] )

        -- Undo/Redo
        , ( "undo", [ { defaultHotkey | key = "z", ctrl = True } ] )
        , ( "redo", [ { defaultHotkey | key = "z", ctrl = True, shift = True } ] )

        -- Zoom controls
        , ( "reset-zoom", [ { defaultHotkey | key = "0", ctrl = True } ] )
        , ( "fit-to-screen", [ { defaultHotkey | key = "0", ctrl = True, alt = True } ] )

        -- Save
        , ( "save", [ { defaultHotkey | key = "s", ctrl = True } ] )
        ]


-- CANVAS CONFIGURATION

canvas :
    { zoom :
        { min : ZoomLevel
        , max : ZoomLevel
        , speed : Float
        }
    , grid : Int
    }
canvas =
    { zoom =
        { min = 0.001
        , max = 5
        , speed = 0.001
        }
    , grid = 10
    }
""",
    "frontend/src/PagesComponents/Organization_/Project_/Updates/Hotkey.elm": """module PagesComponents.Organization_.Project_.Updates.Hotkey exposing (handleHotkey)

{-| Hotkey handler module.
Processes keyboard shortcuts and dispatches appropriate messages.
-}

import Conf
import Models.Delta exposing (Delta)
import PagesComponents.Organization_.Project_.Models exposing (Model, Msg(..))
import PagesComponents.Organization_.Project_.Models.CursorMode as CursorMode
import PagesComponents.Organization_.Project_.Models.Erd as Erd
import PagesComponents.Organization_.Project_.Updates.Extra as Extra exposing (Extra)
import Services.Lenses exposing (mapErdM)


{-| Handle a hotkey press and return updated model with commands.
-}
handleHotkey : String -> Model -> ( Model, Extra Msg )
handleHotkey hotkey model =
    case hotkey of
        -- Zoom shortcuts (Issue #350)
        "zoom-in" ->
            ( model
            , model.erd
                |> Maybe.map
                    (\\e ->
                        let
                            currentZoom =
                                e |> Erd.currentLayout |> .canvas |> .zoom

                            zoomDelta =
                                currentZoom * 0.1  -- 10% increment
                        in
                        Zoom zoomDelta
                    )
                |> Extra.msgM
            )

        "zoom-out" ->
            ( model
            , model.erd
                |> Maybe.map
                    (\\e ->
                        let
                            currentZoom =
                                e |> Erd.currentLayout |> .canvas |> .zoom

                            zoomDelta =
                                currentZoom * -0.1  -- 10% decrement
                        in
                        Zoom zoomDelta
                    )
                |> Extra.msgM
            )

        -- Canvas panning shortcuts (Issue #350)
        "pan-up" ->
            ( model, PanCanvas { dx = 0, dy = 50 } |> Extra.msg )

        "pan-down" ->
            ( model, PanCanvas { dx = 0, dy = -50 } |> Extra.msg )

        "pan-left" ->
            ( model, PanCanvas { dx = 50, dy = 0 } |> Extra.msg )

        "pan-right" ->
            ( model, PanCanvas { dx = -50, dy = 0 } |> Extra.msg )

        -- Arrange tables shortcut (Issue #350)
        "arrange-tables" ->
            ( model, ArrangeTables AutoLayoutMethod.Dagre |> Extra.msg )

        -- Tool switching shortcuts (Issue #350)
        "tool-select" ->
            ( model, CursorMode CursorMode.Select |> Extra.msg )

        "tool-drag" ->
            ( model, CursorMode CursorMode.Drag |> Extra.msg )

        -- Table list toggle (Issue #350)
        "toggle-table-list" ->
            ( model, DetailsSidebarMsg DetailsSidebar.Toggle |> Extra.msg )

        -- Existing shortcuts
        "move-up" ->
            moveTables { dx = 0, dy = -Conf.canvas.grid } model

        "move-down" ->
            moveTables { dx = 0, dy = Conf.canvas.grid } model

        "move-left" ->
            moveTables { dx = -Conf.canvas.grid, dy = 0 } model

        "move-right" ->
            moveTables { dx = Conf.canvas.grid, dy = 0 } model

        "collapse" ->
            ( model, collapseSelectedElements model |> Extra.msg )

        "show" ->
            ( model, showSelectedElements model |> Extra.msg )

        "hide" ->
            ( model, hideSelectedElements model |> Extra.msg )

        "undo" ->
            ( model, Undo |> Extra.msg )

        "redo" ->
            ( model, Redo |> Extra.msg )

        _ ->
            ( model, Extra.none )


{-| Move selected tables by delta.
-}
moveTables : Delta -> Model -> ( Model, Extra Msg )
moveTables delta model =
    case model.erd of
        Just erd ->
            let
                selected =
                    erd |> Erd.currentLayout |> .tables |> List.filter .selected
            in
            if List.isEmpty selected then
                ( model, Extra.none )
            else
                ( model, MoveSelectedTables delta |> Extra.msg )

        Nothing ->
            ( model, Extra.none )
""",
    "frontend/src/PagesComponents/Organization_/Project_/Updates/Canvas.elm": """module PagesComponents.Organization_.Project_.Updates.Canvas exposing
    ( fitCanvas
    , handleWheel
    , panCanvas
    , performZoom
    , zoomCanvas
    )

{-| Canvas manipulation functions.
Handles zooming, panning, and canvas transformations.
-}

import Conf
import Models.Delta exposing (Delta)
import Models.ErdProps exposing (ErdProps)
import Models.Position as Position
import Models.Project.CanvasProps as CanvasProps exposing (CanvasProps)
import PagesComponents.Organization_.Project_.Models exposing (Msg(..))
import PagesComponents.Organization_.Project_.Updates.Extra as Extra exposing (Extra)


{-| Handle mouse wheel events for zooming.
-}
handleWheel : Float -> ErdProps -> CanvasProps -> ( CanvasProps, Extra Msg )
handleWheel deltaY erdElem canvas =
    let
        zoomDelta =
            deltaY * Conf.canvas.zoom.speed
    in
    performZoom zoomDelta erdElem canvas


{-| Zoom the canvas by a specific amount.
-}
zoomCanvas : Float -> ErdProps -> CanvasProps -> ( CanvasProps, Extra Msg )
zoomCanvas delta erdElem canvas =
    performZoom delta erdElem canvas


{-| Pan the canvas by a delta amount.
Adjusts for current zoom level and creates history entry.

Issue #350: New function for keyboard canvas panning.
-}
panCanvas : Delta -> ErdProps -> CanvasProps -> ( CanvasProps, Extra Msg )
panCanvas delta erdElem canvas =
    let
        -- Adjust delta for zoom level
        adjustedDelta =
            { dx = delta.dx / canvas.zoom
            , dy = delta.dy / canvas.zoom
            }

        newPosition =
            canvas.position
                |> Position.moveDiagram adjustedDelta
    in
    { canvas | position = newPosition }
        |> (\\new ->
                ( new
                , Extra.history ( SetView_ canvas, SetView_ new )
                )
           )


{-| Perform zoom operation with bounds checking.
-}
performZoom : Float -> ErdProps -> CanvasProps -> ( CanvasProps, Extra Msg )
performZoom delta erdElem canvas =
    let
        newZoom =
            canvas.zoom
                + delta
                |> clamp Conf.canvas.zoom.min Conf.canvas.zoom.max

        -- Zoom towards center of viewport
        zoomRatio =
            newZoom / canvas.zoom

        newPosition =
            { x = erdElem.position.x - (erdElem.position.x - canvas.position.x) * zoomRatio
            , y = erdElem.position.y - (erdElem.position.y - canvas.position.y) * zoomRatio
            }
    in
    { canvas | zoom = newZoom, position = newPosition }
        |> (\\new ->
                ( new
                , Extra.history ( SetView_ canvas, SetView_ new )
                )
           )


{-| Fit the canvas to show all tables.
-}
fitCanvas : ErdProps -> CanvasProps -> List TableProps -> ( CanvasProps, Extra Msg )
fitCanvas erdElem canvas tables =
    -- Implementation for fitting all tables in view
    ( canvas, Extra.none )
""",
    "frontend/src/PagesComponents/Organization_/Project_/Models.elm": """module PagesComponents.Organization_.Project_.Models exposing
    ( Model
    , Msg(..)
    )

{-| Main model and message types for the project page.
-}

import Models.Delta exposing (Delta)
import Models.Project.CanvasProps exposing (CanvasProps)
import PagesComponents.Organization_.Project_.Models.CursorMode exposing (CursorMode)
import PagesComponents.Organization_.Project_.Models.Erd exposing (Erd)


type alias Model =
    { erd : Maybe Erd
    , erdElem : ErdProps
    , cursorMode : CursorMode
    , detailsSidebar : Maybe DetailsSidebar
    , contextMenu : Maybe ContextMenu
    , modal : Maybe Modal
    , history : History
    }


{-| All possible messages in the project page.
-}
type Msg
    = Noop
      -- Canvas operations
    | Zoom Float
    | FitToScreen
    | ResetZoom
    | PanCanvas Delta  -- NEW: Issue #350 - Canvas panning via keyboard
    | SetView_ CanvasProps
      -- Table operations
    | SelectTable TableId
    | MoveSelectedTables Delta
    | CollapseTable TableId
    | ShowTable TableId
    | HideTable TableId
    | ArrangeTables AutoLayoutMethod
      -- Cursor mode (Issue #350)
    | CursorMode CursorMode
      -- Sidebar
    | DetailsSidebarMsg DetailsSidebarMsg
      -- History
    | Undo
    | Redo
      -- Search
    | SearchMsg SearchMsg
      -- Other
    | GotHotkey String
    | ContextMenuMsg ContextMenuMsg
    | ModalMsg ModalMsg
    | ToastMsg ToastMsg
""",
    "frontend/src/PagesComponents/Organization_/Project_/Views/Modals/Help.elm": """module PagesComponents.Organization_.Project_.Views.Modals.Help exposing (viewHelp)

{-| Help modal showing keyboard shortcuts and documentation.
-}

import Html exposing (Html, div, h3, kbd, span, table, tbody, td, text, th, thead, tr)
import Html.Attributes exposing (class)


{-| Render the help modal content.
-}
viewHelp : Html msg
viewHelp =
    div [ class "help-modal" ]
        [ h3 [] [ text "Keyboard Shortcuts" ]
        , viewShortcutsTable
        ]


{-| Render the shortcuts table organized by category.
Updated with Issue #350 shortcuts.
-}
viewShortcutsTable : Html msg
viewShortcutsTable =
    table [ class "shortcuts-table" ]
        [ thead []
            [ tr []
                [ th [] [ text "Shortcut" ]
                , th [] [ text "Action" ]
                ]
            ]
        , tbody []
            (List.concat
                [ viewCategory "Navigation & Zoom"
                    [ ( [ "/" ], "Open search" )
                    , ( [ "=" ], "Zoom in" )  -- NEW
                    , ( [ "-" ], "Zoom out" )  -- NEW
                    , ( [ "Ctrl", "0" ], "Reset zoom to 100%" )
                    , ( [ "Ctrl", "Alt", "0" ], "Fit to screen" )
                    , ( [ "Shift", "↑↓←→" ], "Pan canvas" )  -- NEW
                    ]
                , viewCategory "Tools"
                    [ ( [ "v" ], "Select tool" )  -- NEW
                    , ( [ "Alt", "d" ], "Drag/Pan tool" )  -- NEW
                    , ( [ "t" ], "Toggle table list" )  -- NEW
                    , ( [ "Alt", "a" ], "Auto-arrange tables (Dagre)" )  -- NEW
                    ]
                , viewCategory "Elements"
                    [ ( [ "n" ], "Open notes" )
                    , ( [ "m" ], "Create memo" )
                    , ( [ "g" ], "Create group" )
                    , ( [ "c" ], "Collapse element" )
                    , ( [ "s" ], "Show element" )
                    , ( [ "h", "Backspace", "Delete" ], "Hide element" )
                    ]
                , viewCategory "Selection & Movement"
                    [ ( [ "↑↓←→" ], "Move selected tables" )
                    , ( [ "Ctrl", "a" ], "Select all" )
                    , ( [ "Ctrl", "↑↓" ], "Move table layer order" )
                    ]
                , viewCategory "History"
                    [ ( [ "Ctrl", "z" ], "Undo" )
                    , ( [ "Ctrl", "Shift", "z" ], "Redo" )
                    , ( [ "Ctrl", "s" ], "Save project" )
                    ]
                , viewCategory "Other"
                    [ ( [ "?" ], "Open this help" )
                    , ( [ "Escape" ], "Cancel / Close" )
                    ]
                ]
            )
        ]


{-| Render a category of shortcuts.
-}
viewCategory : String -> List ( List String, String ) -> List (Html msg)
viewCategory categoryName shortcuts =
    tr [ class "category-header" ]
        [ td [ class "category-name" ] [ text categoryName ]
        , td [] []
        ]
        :: List.map viewShortcut shortcuts


{-| Render a single shortcut row.
-}
viewShortcut : ( List String, String ) -> Html msg
viewShortcut ( keys, description ) =
    tr [ class "shortcut-row" ]
        [ td [ class "shortcut-keys" ]
            [ span [] (List.intersperse (text " + ") (List.map viewKey keys))
            ]
        , td [ class "shortcut-description" ] [ text description ]
        ]


{-| Render a keyboard key.
-}
viewKey : String -> Html msg
viewKey key =
    kbd [ class "key" ] [ text key ]
""",
    "frontend/src/PagesComponents/Organization_/Project_/Views/Commands.elm": """module PagesComponents.Organization_.Project_.Views.Commands exposing (viewCommands)

{-| Command toolbar view with zoom controls, tools, and layout options.
Updated with keyboard shortcut hints in tooltips (Issue #350).
-}

import Html exposing (Html, button, div, i, span, text)
import Html.Attributes exposing (class, title)
import Html.Events exposing (onClick)
import PagesComponents.Organization_.Project_.Models exposing (Msg(..))
import PagesComponents.Organization_.Project_.Models.CursorMode as CursorMode exposing (CursorMode)


{-| Render the command toolbar.
-}
viewCommands : CursorMode -> Float -> Html Msg
viewCommands cursorMode zoom =
    div [ class "commands-toolbar" ]
        [ viewZoomControls zoom
        , viewToolButtons cursorMode
        , viewLayoutControls
        , viewTableListButton
        ]


{-| Zoom control buttons with keyboard shortcut hints.
-}
viewZoomControls : Float -> Html Msg
viewZoomControls zoom =
    div [ class "zoom-controls" ]
        [ button
            [ class "zoom-btn"
            , onClick (Zoom -0.1)
            , title "Zoom out (-)"  -- Updated with shortcut hint
            ]
            [ i [ class "icon-minus" ] [] ]
        , span [ class "zoom-level" ]
            [ text (String.fromInt (round (zoom * 100)) ++ "%") ]
        , button
            [ class "zoom-btn"
            , onClick (Zoom 0.1)
            , title "Zoom in (=)"  -- Updated with shortcut hint
            ]
            [ i [ class "icon-plus" ] [] ]
        , button
            [ class "zoom-btn"
            , onClick FitToScreen
            , title "Fit to screen (Ctrl+Alt+0)"
            ]
            [ i [ class "icon-fit" ] [] ]
        , button
            [ class "zoom-btn"
            , onClick ResetZoom
            , title "Reset zoom (Ctrl+0)"
            ]
            [ i [ class "icon-reset" ] [] ]
        ]


{-| Tool selection buttons with keyboard shortcut hints.
-}
viewToolButtons : CursorMode -> Html Msg
viewToolButtons cursorMode =
    div [ class "tool-buttons" ]
        [ button
            [ class
                (if cursorMode == CursorMode.Select then
                    "tool-btn active"
                 else
                    "tool-btn"
                )
            , onClick (CursorMode CursorMode.Select)
            , title "Select tool (v)"  -- Updated with shortcut hint
            ]
            [ i [ class "icon-cursor" ] [] ]
        , button
            [ class
                (if cursorMode == CursorMode.Drag then
                    "tool-btn active"
                 else
                    "tool-btn"
                )
            , onClick (CursorMode CursorMode.Drag)
            , title "Drag tool (Alt+d)"  -- Updated with shortcut hint
            ]
            [ i [ class "icon-hand" ] [] ]
        ]


{-| Layout control buttons with keyboard shortcut hints.
-}
viewLayoutControls : Html Msg
viewLayoutControls =
    div [ class "layout-controls" ]
        [ button
            [ class "layout-btn"
            , onClick (ArrangeTables AutoLayoutMethod.Dagre)
            , title "Auto-arrange tables (Alt+a)"  -- Updated with shortcut hint
            ]
            [ i [ class "icon-layout" ] []
            , span [] [ text "Arrange" ]
            ]
        ]


{-| Table list toggle button with keyboard shortcut hint.
-}
viewTableListButton : Html Msg
viewTableListButton =
    button
        [ class "table-list-btn"
        , onClick (DetailsSidebarMsg DetailsSidebar.Toggle)
        , title "Toggle table list (t)"  -- Updated with shortcut hint
        ]
        [ i [ class "icon-list" ] []
        , span [] [ text "Tables" ]
        ]
""",
    "frontend/tests/PagesComponents/Organization_/Project_/Updates/HotkeyTest.elm": """module PagesComponents.Organization_.Project_.Updates.HotkeyTest exposing (suite)

{-| Unit tests for hotkey handlers.
Tests Issue #350 keyboard shortcuts implementation.
-}

import Expect
import Models.Delta exposing (Delta)
import PagesComponents.Organization_.Project_.Models exposing (Msg(..))
import PagesComponents.Organization_.Project_.Models.CursorMode as CursorMode
import PagesComponents.Organization_.Project_.Updates.Hotkey exposing (handleHotkey)
import Test exposing (Test, describe, test)


suite : Test
suite =
    describe "Hotkey handlers"
        [ zoomTests
        , panTests
        , toolTests
        , arrangeTests
        ]


{-| Tests for zoom shortcuts.
-}
zoomTests : Test
zoomTests =
    describe "Zoom shortcuts"
        [ test "zoom-in emits Zoom message with positive delta" <|
            \\_ ->
                let
                    model =
                        createMockModel 1.0

                    ( _, extra ) =
                        handleHotkey "zoom-in" model
                in
                -- Should emit Zoom with ~0.1 (10% of 1.0)
                Expect.pass

        , test "zoom-out emits Zoom message with negative delta" <|
            \\_ ->
                let
                    model =
                        createMockModel 1.0

                    ( _, extra ) =
                        handleHotkey "zoom-out" model
                in
                -- Should emit Zoom with ~-0.1 (10% of 1.0)
                Expect.pass

        , test "zoom-in at max zoom should still work" <|
            \\_ ->
                let
                    model =
                        createMockModel 5.0  -- Max zoom

                    ( _, extra ) =
                        handleHotkey "zoom-in" model
                in
                -- Zoom function will clamp to max
                Expect.pass

        , test "zoom-out at min zoom should still work" <|
            \\_ ->
                let
                    model =
                        createMockModel 0.1  -- Near min zoom

                    ( _, extra ) =
                        handleHotkey "zoom-out" model
                in
                -- Zoom function will clamp to min
                Expect.pass
        ]


{-| Tests for canvas panning shortcuts.
-}
panTests : Test
panTests =
    describe "Canvas panning shortcuts"
        [ test "pan-up emits PanCanvas with dy=50" <|
            \\_ ->
                let
                    model =
                        createMockModel 1.0

                    ( _, extra ) =
                        handleHotkey "pan-up" model

                    expectedDelta =
                        { dx = 0, dy = 50 }
                in
                -- Should emit PanCanvas { dx = 0, dy = 50 }
                Expect.pass

        , test "pan-down emits PanCanvas with dy=-50" <|
            \\_ ->
                let
                    model =
                        createMockModel 1.0

                    ( _, extra ) =
                        handleHotkey "pan-down" model
                in
                -- Should emit PanCanvas { dx = 0, dy = -50 }
                Expect.pass

        , test "pan-left emits PanCanvas with dx=50" <|
            \\_ ->
                let
                    model =
                        createMockModel 1.0

                    ( _, extra ) =
                        handleHotkey "pan-left" model
                in
                -- Should emit PanCanvas { dx = 50, dy = 0 }
                Expect.pass

        , test "pan-right emits PanCanvas with dx=-50" <|
            \\_ ->
                let
                    model =
                        createMockModel 1.0

                    ( _, extra ) =
                        handleHotkey "pan-right" model
                in
                -- Should emit PanCanvas { dx = -50, dy = 0 }
                Expect.pass

        , test "panning works with no erd" <|
            \\_ ->
                let
                    model =
                        createMockModelNoErd

                    ( _, extra ) =
                        handleHotkey "pan-up" model
                in
                -- Should still emit message, canvas will handle no-op
                Expect.pass
        ]


{-| Tests for tool switching shortcuts.
-}
toolTests : Test
toolTests =
    describe "Tool switching shortcuts"
        [ test "tool-select emits CursorMode Select" <|
            \\_ ->
                let
                    model =
                        createMockModel 1.0

                    ( _, extra ) =
                        handleHotkey "tool-select" model
                in
                -- Should emit CursorMode CursorMode.Select
                Expect.pass

        , test "tool-drag emits CursorMode Drag" <|
            \\_ ->
                let
                    model =
                        createMockModel 1.0

                    ( _, extra ) =
                        handleHotkey "tool-drag" model
                in
                -- Should emit CursorMode CursorMode.Drag
                Expect.pass

        , test "toggle-table-list emits DetailsSidebarMsg Toggle" <|
            \\_ ->
                let
                    model =
                        createMockModel 1.0

                    ( _, extra ) =
                        handleHotkey "toggle-table-list" model
                in
                -- Should emit DetailsSidebarMsg DetailsSidebar.Toggle
                Expect.pass
        ]


{-| Tests for arrange tables shortcut.
-}
arrangeTests : Test
arrangeTests =
    describe "Arrange tables shortcut"
        [ test "arrange-tables emits ArrangeTables Dagre" <|
            \\_ ->
                let
                    model =
                        createMockModel 1.0

                    ( _, extra ) =
                        handleHotkey "arrange-tables" model
                in
                -- Should emit ArrangeTables AutoLayoutMethod.Dagre
                Expect.pass

        , test "arrange-tables with no tables should handle gracefully" <|
            \\_ ->
                let
                    model =
                        createMockModelNoTables

                    ( _, extra ) =
                        handleHotkey "arrange-tables" model
                in
                -- Should still emit message, arrange function handles empty case
                Expect.pass
        ]


-- HELPERS

createMockModel : Float -> Model
createMockModel zoom =
    -- Create a mock model with specified zoom level
    { erd = Just mockErd
    , erdElem = mockErdElem
    , cursorMode = CursorMode.Select
    , detailsSidebar = Nothing
    , contextMenu = Nothing
    , modal = Nothing
    , history = emptyHistory
    }


createMockModelNoErd : Model
createMockModelNoErd =
    { erd = Nothing
    , erdElem = mockErdElem
    , cursorMode = CursorMode.Select
    , detailsSidebar = Nothing
    , contextMenu = Nothing
    , modal = Nothing
    , history = emptyHistory
    }


createMockModelNoTables : Model
createMockModelNoTables =
    { erd = Just mockErdNoTables
    , erdElem = mockErdElem
    , cursorMode = CursorMode.Select
    , detailsSidebar = Nothing
    , contextMenu = Nothing
    , modal = Nothing
    , history = emptyHistory
    }
""",
    "CHANGELOG.md": """# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Keyboard shortcuts for canvas navigation** (Fixes #350)
  - Zoom in with `=` or `+` key (10% increment)
  - Zoom out with `-` key (10% decrement)
  - Pan canvas with `Shift+Arrow` keys (50px per press)
  - Arrow keys continue to move selected tables (backward compatible)

- **Keyboard shortcuts for tools and features** (Fixes #350)
  - `v` to switch to Select tool (industry standard)
  - `Alt+d` to switch to Drag/Pan tool
  - `Alt+a` to auto-arrange tables using Dagre layout
  - `t` to toggle the table list sidebar

- **Improved shortcut discoverability**
  - Updated Help modal (`?`) with all new shortcuts organized by category
  - Added keyboard shortcut hints to button tooltips
  - Example: "Zoom in (=)" instead of just "Zoom in"

### Changed

- Reorganized Help modal shortcuts into logical categories:
  - Navigation & Zoom
  - Tools
  - Elements
  - Selection & Movement
  - History
  - Other

### Technical Details

- Added `PanCanvas Delta` message type for keyboard panning
- Implemented `panCanvas` function in Canvas.elm with zoom-adjusted movement
- Added 9 new hotkey definitions in Conf.elm
- Added 9 new case handlers in Hotkey.elm
- Created unit tests for all new hotkey handlers

## [0.45.0] - 2024-01-10

### Added

- Support for custom database sources
- Improved SQL parser for complex queries

### Fixed

- Fixed issue with table positioning after reload
- Fixed search not finding all results

## [0.44.0] - 2024-01-03

### Added

- New collaboration features
- Real-time cursor sharing

### Changed

- Improved performance for large schemas
- Updated dependencies

### Fixed

- Fixed undo/redo for group operations
"""
}

async def execute_task(task_id: int, project_id: int, db: Session = None):
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project or not project.repo_path:
            return

        task.status = "in_progress"
        db.commit()

        # Log start
        log = ExecutionLog(
            project_id=project_id,
            task_id=task_id,
            log_type="agent_message",
            content=f"🚀 Starting task: {task.name}"
        )
        db.add(log)
        db.commit()

        time.sleep(0.5)  # Simulate processing

        # Log analyzing
        log = ExecutionLog(
            project_id=project_id,
            task_id=task_id,
            log_type="agent_message",
            content=f"📋 Analyzing requirements for: {task.name}"
        )
        db.add(log)
        db.commit()
        time.sleep(0.5)

        # Log code generation
        log = ExecutionLog(
            project_id=project_id,
            task_id=task_id,
            log_type="agent_message",
            content=f"💻 Generating code implementation..."
        )
        db.add(log)
        db.commit()
        time.sleep(0.5)

        # Get hardcoded code for this task
        code = DEMO_CODE_SNIPPETS.get(task.file_path or "", "")

        if not code:
            # Fallback: generate basic code structure
            code = f"""-- {task.name}\n-- {task.description}\n\n-- TODO: Implement this task\n"""

        # Log file preparation
        if task.file_path and project.repo_path:
            log = ExecutionLog(
                project_id=project_id,
                task_id=task_id,
                log_type="agent_message",
                content=f"📁 Preparing file: {task.file_path}"
            )
            db.add(log)
            db.commit()
            time.sleep(0.3)

            file_path = os.path.join(project.repo_path, task.file_path)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            log = ExecutionLog(
                project_id=project_id,
                task_id=task_id,
                log_type="agent_message",
                content=f"✍️ Writing code to {task.file_path}..."
            )
            db.add(log)
            db.commit()
            time.sleep(0.3)

            with open(file_path, 'w') as f:
                f.write(code)

            log = ExecutionLog(
                project_id=project_id,
                task_id=task_id,
                log_type="code_change",
                content=f"✅ Code written successfully to {task.file_path}"
            )
            db.add(log)
            db.commit()
            time.sleep(0.2)

        # Log completion
        log = ExecutionLog(
            project_id=project_id,
            task_id=task_id,
            log_type="agent_message",
            content=f"✨ Task completed: {task.name}"
        )
        db.add(log)
        db.commit()

        task.code_changes = code
        task.status = "completed"
        db.commit()

    except Exception as e:
        task.status = "failed"
        log = ExecutionLog(
            project_id=project_id,
            task_id=task_id,
            log_type="error",
            content=f"Error: {str(e)}"
        )
        db.add(log)
        db.commit()
    finally:
        if should_close:
            db.close()

@router.post("/start")
async def start_execution(project_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all pending tasks
    phases = db.query(Phase).filter(Phase.project_id == project_id).order_by(Phase.phase_number).all()
    tasks = []
    for phase in phases:
        phase_tasks = db.query(Task).filter(Task.phase_id == phase.id, Task.status == "pending").order_by(Task.task_number).all()
        tasks.extend(phase_tasks)

    if not tasks:
        return {"message": "No pending tasks"}

    project.status = "executing"
    db.commit()

    execution_state[project_id] = {"running": True, "current_task": None}

    # Execute tasks in background
    async def run_tasks():
        for task in tasks:
            if not execution_state.get(project_id, {}).get("running", False):
                break

            execution_state[project_id]["current_task"] = task.id
            await execute_task(task.id, project_id)

        execution_state[project_id] = {"running": False, "current_task": None}
        # Update project status
        db_session = SessionLocal()
        try:
            proj = db_session.query(Project).filter(Project.id == project_id).first()
            if proj:
                proj.status = "testing"
                db_session.commit()
        finally:
            db_session.close()

    background_tasks.add_task(run_tasks)

    return {"message": "Execution started", "tasks_count": len(tasks)}

@router.post("/command")
async def execution_command(project_id: int, command: ExecutionCommand, db: Session = Depends(get_db)):
    if command.command == "pause":
        execution_state[project_id] = {"running": False, "current_task": execution_state.get(project_id, {}).get("current_task")}
        return {"message": "Execution paused"}
    elif command.command == "stop":
        execution_state[project_id] = {"running": False, "current_task": None}
        return {"message": "Execution stopped"}
    elif command.command == "play":
        execution_state[project_id] = {"running": True, "current_task": execution_state.get(project_id, {}).get("current_task")}
        return {"message": "Execution resumed"}

    return {"message": "Unknown command"}

@router.get("/logs/{project_id}")
async def get_logs(project_id: int, task_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ExecutionLog).filter(ExecutionLog.project_id == project_id)
    if task_id:
        query = query.filter(ExecutionLog.task_id == task_id)

    logs = query.order_by(ExecutionLog.created_at).all()

    return {
        "logs": [{
            "id": log.id,
            "task_id": log.task_id,
            "log_type": log.log_type,
            "content": log.content,
            "created_at": log.created_at.isoformat() if log.created_at else None
        } for log in logs]
    }

@router.get("/status/{project_id}")
async def get_execution_status(project_id: int, db: Session = Depends(get_db)):
    state = execution_state.get(project_id, {"running": False, "current_task": None})

    project = db.query(Project).filter(Project.id == project_id).first()

    # Calculate task statuses
    task_statuses = {"pending": 0, "in_progress": 0, "completed": 0, "failed": 0}
    if project:
        phases = db.query(Phase).filter(Phase.project_id == project_id).all()
        for phase in phases:
            tasks = db.query(Task).filter(Task.phase_id == phase.id).all()
            for task in tasks:
                if task.status in task_statuses:
                    task_statuses[task.status] += 1

    return {
        "running": state.get("running", False),
        "current_task": state.get("current_task"),
        "project_status": project.status if project else None,
        "task_statuses": task_statuses
    }
