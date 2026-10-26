from dataclasses import dataclass

@dataclass
class Segment:
    page_number: int
    char_start: int
    char_end: int
    number: str | None # "3.1"
    heading: str | None # "Rent"
    text: str 