// features/nav/index.ts — public API for the nav feature

export { default as AppShell }            from './AppShell';
export { default as ActiveSessionBanner } from './ActiveSessionBanner';
export { default as MobileNav }           from './MobileNav';
export { default as Sidebar }             from './Sidebar';
export { getNav, filterNavByFeatures, navByRole } from './navConfig';
export type { NavItem, NavSection } from './navConfig';
