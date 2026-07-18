// Compatibility shim for any out-of-tree demo code that still uses the old
// P1 mock module. The child flow imports these modules directly.
export { estimate, levelBand, nextItem } from "@/lib/cat";
export { itemBank as itemPool } from "@/lib/itemBank";
