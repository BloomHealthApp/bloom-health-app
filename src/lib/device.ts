const TABLET_MIN_SIDE = 600;

/** Android's usual tablet cutoff: at least 600dp on the shorter side, so rotation doesn't change the answer. */
export const isTablet = (width: number, height: number): boolean => Math.min(width, height) >= TABLET_MIN_SIDE;
