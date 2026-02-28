# Accessibility Review Checklist

## Purpose

This checklist guides code reviewers through a structured evaluation of accessibility in pull requests. It covers WCAG 2.1 AA compliance, semantic markup, assistive technology support, and common pitfalls in React and Next.js applications. Each item should be verified against the changes introduced in the PR.

## WCAG 2.1 AA Compliance Overview

- [ ] All new UI meets WCAG 2.1 Level AA success criteria
- [ ] Content is perceivable, operable, understandable, and robust (POUR principles)
- [ ] No information is conveyed solely through color, shape, or visual position
- [ ] Text content can be resized up to 200% without loss of functionality
- [ ] Content reflows correctly at 320px viewport width without horizontal scrolling
- [ ] Time-based interactions provide mechanisms to pause, stop, or extend

## Semantic HTML

- [ ] Heading levels follow a logical hierarchy (h1 through h6, no skipped levels)
- [ ] Page landmarks are present: `<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`
- [ ] Lists use `<ul>`, `<ol>`, or `<dl>` elements rather than styled divs
- [ ] Tables use `<th>`, `<caption>`, and `scope` attributes for data relationships
- [ ] Buttons use `<button>` elements, not clickable `<div>` or `<span>` elements
- [ ] Links use `<a>` elements with meaningful `href` values
- [ ] Form inputs have associated `<label>` elements (using `htmlFor` in React)
- [ ] Regions of the page are identifiable without relying on visual styling alone

## ARIA Attributes

- [ ] ARIA roles are used only when native HTML elements cannot provide the semantics
- [ ] `aria-label` or `aria-labelledby` is provided for elements without visible text labels
- [ ] `aria-describedby` is used for supplemental instructions (e.g., form field hints)
- [ ] Interactive components use appropriate roles (`dialog`, `tablist`, `menu`, `alert`)
- [ ] `aria-expanded`, `aria-selected`, and `aria-checked` reflect current component state
- [ ] `aria-hidden="true"` is applied to decorative elements and icons without meaning
- [ ] Live regions (`aria-live="polite"` or `aria-live="assertive"`) announce dynamic content updates
- [ ] `aria-live` regions exist in the DOM before content is injected into them
- [ ] No redundant ARIA roles that duplicate native element semantics (e.g., `role="button"` on `<button>`)

## Keyboard Navigation

- [ ] All interactive elements are reachable via Tab and Shift+Tab
- [ ] Tab order follows a logical reading sequence matching the visual layout
- [ ] Custom widgets implement expected keyboard patterns (Arrow keys, Enter, Escape, Space)
- [ ] Dropdown menus and modal dialogs can be dismissed with the Escape key
- [ ] No keyboard traps exist where focus cannot leave a component
- [ ] Skip navigation links are provided to bypass repetitive content blocks
- [ ] Shortcut keys do not conflict with browser or assistive technology defaults

## Focus Management

- [ ] Focus is moved to new content when modals, drawers, or dialogs open
- [ ] Focus returns to the triggering element when a modal or popover closes
- [ ] Focus is visible on all interactive elements (outline or equivalent indicator)
- [ ] Custom focus styles meet the 3:1 contrast ratio against adjacent colors
- [ ] Focus is not moved unexpectedly without user-initiated action
- [ ] Route changes in Next.js programmatically manage focus to the new page content
- [ ] Dynamically inserted content (toasts, alerts) does not steal focus from the current task

## Color Contrast

- [ ] Normal text (below 18pt / 14pt bold) meets a 4.5:1 contrast ratio against its background
- [ ] Large text (18pt+ or 14pt+ bold) meets a 3:1 contrast ratio against its background
- [ ] UI components and graphical objects meet a 3:1 contrast ratio against adjacent colors
- [ ] Focus indicators meet a 3:1 contrast ratio against the surrounding background
- [ ] Contrast requirements are met in both light and dark themes
- [ ] Placeholder text in form fields meets contrast requirements or is not the sole label
- [ ] Link text is distinguishable from surrounding body text by more than color alone

## Screen Reader Compatibility

- [ ] Images have descriptive `alt` text, or `alt=""` for purely decorative images
- [ ] Icon-only buttons include an `aria-label` describing the action
- [ ] Form error messages are associated with their fields and announced on appearance
- [ ] Page title updates on route changes to reflect the current view
- [ ] Loading states and progress indicators are announced to assistive technology
- [ ] Visually hidden text (`.sr-only`) is used where context is needed for non-visual users
- [ ] Content order in the DOM matches the intended reading order

## Common Accessibility Mistakes in React and Next.js

- [ ] `<img>` tags rendered by Next.js `Image` component include meaningful `alt` attributes
- [ ] Client-side route transitions announce the new page to screen readers
- [ ] Fragment wrappers (`<>...</>`) do not break heading or landmark hierarchy
- [ ] `onClick` handlers on non-interactive elements also provide `onKeyDown` and a `role`
- [ ] Conditional rendering does not leave orphaned `aria-describedby` or `aria-labelledby` references
- [ ] Third-party component libraries are verified for accessibility before adoption
- [ ] SVG elements include `<title>` or `aria-label` when they convey meaning

## Testing Tools and Verification

- [ ] Automated scan with axe-core or axe DevTools reports no critical or serious violations
- [ ] Lighthouse accessibility score is 90 or above for affected pages
- [ ] Manual keyboard-only navigation test confirms all flows are completable
- [ ] Screen reader testing performed with at least one of: NVDA, VoiceOver, or JAWS
- [ ] Browser zoom at 200% does not break layout or hide content
- [ ] High contrast mode (Windows) or forced colors mode does not make content unusable
- [ ] Reduced motion preference (`prefers-reduced-motion`) disables non-essential animations

## Severity Classification

When reporting accessibility findings, classify as:
- **Critical**: Complete barrier preventing access (missing form labels, keyboard traps, zero-contrast text)
- **High**: Significant barrier affecting core workflows (broken focus management, missing live regions)
- **Medium**: Degraded experience for assistive technology users (poor heading structure, missing alt text)
- **Low**: Minor improvements (suboptimal ARIA usage, verbose alt text)
- **Informational**: Best practice suggestions with no immediate access barrier
