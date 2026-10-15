// The entrance's contract: a full-screen door over the front door, the brand mark as its lock.

export interface EntranceProps {
  /**
   * Call once, the moment the door starts to open and the city can be seen: the city's intro (districts rising, the
   * light coming on) starts then, under the opening door.
   */
  onOpen: () => void;
  /** Call once, when the door is entirely gone: the overlay unmounts. */
  onDone: () => void;
}
