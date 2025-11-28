from pydantic import BaseModel
from typing import Optional


class TerminalCreate(BaseModel):
    cols: int = 80
    rows: int = 24


class TerminalResponse(BaseModel):
    terminal_id: str
    status: str
    message: str


class TerminalInput(BaseModel):
    terminal_id: str
    data: str


class TerminalResize(BaseModel):
    terminal_id: str
    cols: int
    rows: int
