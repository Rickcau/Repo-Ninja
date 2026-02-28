# WCAG 2.1 AA Compliance Checklist

## Purpose

This checklist provides detailed WCAG 2.1 Level AA success criteria for use during code reviews. Apply each item to frontend pull requests to verify that new or modified UI components meet accessibility requirements. Mark each item as Pass, Fail, or Not Applicable based on the changes under review.

## Perceivable

### 1.1 Text Alternatives

- [ ] All `<img>` elements have meaningful `alt` attributes (1.1.1)
- [ ] Decorative images use `alt=""` or `role="presentation"` to be ignored by screen readers (1.1.1)
- [ ] Icon-only buttons and links include accessible labels via `aria-label` or visually hidden text (1.1.1)
- [ ] SVG elements used as images include `role="img"` and a `<title>` element or `aria-label` (1.1.1)

```html
<!-- Correct: icon button with accessible label -->
<button aria-label="Close dialog">
  <svg role="img" aria-hidden="true">...</svg>
</button>
```

### 1.2 Time-Based Media

- [ ] Pre-recorded video content has captions (1.2.2)
- [ ] Pre-recorded audio content has a text transcript (1.2.1)
- [ ] Pre-recorded video includes audio descriptions when visual content is not conveyed by the soundtrack (1.2.5)

### 1.3 Adaptable

- [ ] Heading levels follow a logical hierarchy without skipping levels (1.3.1)
- [ ] Form inputs are associated with `<label>` elements using `htmlFor`/`id` pairing (1.3.1)
- [ ] Lists use semantic `<ul>`, `<ol>`, or `<dl>` elements (1.3.1)
- [ ] Tables use `<th>` with `scope` attributes for row and column headers (1.3.1)
- [ ] Content order in the DOM matches the visual presentation order (1.3.2)
- [ ] Instructions do not rely solely on sensory cues such as shape, color, or position (1.3.3)

```tsx
// Correct: label associated with input
<label htmlFor="email">Email address</label>
<input id="email" type="email" name="email" />
```

### 1.4 Distinguishable

- [ ] Text has a contrast ratio of at least 4.5:1 against its background (1.4.3)
- [ ] Large text (18pt or 14pt bold) has a contrast ratio of at least 3:1 (1.4.3)
- [ ] UI components and graphical objects have a contrast ratio of at least 3:1 (1.4.11)
- [ ] Color is not the only visual means of conveying information or indicating an action (1.4.1)
- [ ] Text can be resized to 200% without loss of content or functionality (1.4.4)
- [ ] Content reflows at 320px viewport width without horizontal scrolling (1.4.10)
- [ ] Text spacing can be overridden without breaking layout (1.4.12)

## Operable

### 2.1 Keyboard Accessible

- [ ] All interactive elements are reachable and operable via keyboard alone (2.1.1)
- [ ] No keyboard traps -- focus can move freely into and out of all components (2.1.2)
- [ ] Custom widgets implement expected keyboard patterns from WAI-ARIA Authoring Practices (2.1.1)
- [ ] `tabIndex` values greater than 0 are not used (2.1.1)

```tsx
// Correct: custom button with keyboard support
<div
  role="button"
  tabIndex={0}
  onClick={handleAction}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleAction();
    }
  }}
>
  Activate
</div>
```

### 2.2 Enough Time

- [ ] Auto-updating content can be paused, stopped, or hidden by the user (2.2.2)
- [ ] Time limits can be extended or turned off, with the user warned before expiration (2.2.1)
- [ ] Session timeouts provide at least 20 hours of inactivity or warn the user with an option to extend (2.2.6)

### 2.3 Seizures and Physical Reactions

- [ ] No content flashes more than three times per second (2.3.1)
- [ ] Animations triggered by interaction can be disabled via `prefers-reduced-motion` (2.3.3)

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2.4 Navigable

- [ ] A skip navigation link is provided to bypass repeated blocks of content (2.4.1)
- [ ] Pages have descriptive, unique `<title>` elements (2.4.2)
- [ ] Focus order follows a logical, meaningful sequence (2.4.3)
- [ ] Link text is descriptive of its destination -- no bare "click here" or "read more" (2.4.4)
- [ ] Multiple ways to locate pages are provided such as search, site map, or navigation (2.4.5)
- [ ] Headings and labels accurately describe their associated content (2.4.6)
- [ ] Focus indicators are visible with sufficient contrast (2.4.7)

### 2.5 Input Modalities

- [ ] Functionality triggered by multipoint or path-based gestures has single-pointer alternatives (2.5.1)
- [ ] Pointer events can be cancelled by releasing outside the target or by using `pointerup` (2.5.2)
- [ ] Visible labels match or are contained within the accessible name (2.5.3)
- [ ] Functionality triggered by device motion has UI alternatives and can be disabled (2.5.4)

## Understandable

### 3.1 Readable

- [ ] The page language is declared with a `lang` attribute on the `<html>` element (3.1.1)
- [ ] Content in a different language from the page default uses a `lang` attribute on the enclosing element (3.1.2)

```html
<html lang="en">
  <body>
    <p>This is English text.</p>
    <p lang="es">Este es texto en espanol.</p>
  </body>
</html>
```

### 3.2 Predictable

- [ ] Receiving focus does not trigger unexpected context changes such as navigation or form submission (3.2.1)
- [ ] Changing a form input value does not automatically cause a context change unless the user is warned (3.2.2)
- [ ] Navigation mechanisms are consistent across pages (3.2.3)
- [ ] Components with the same function are identified consistently throughout the application (3.2.4)

### 3.3 Input Assistance

- [ ] Input errors are identified and described to the user in text (3.3.1)
- [ ] Form fields include labels or instructions (3.3.2)
- [ ] Error suggestions are provided when the system can detect the correction (3.3.3)
- [ ] Legal, financial, or data-altering submissions are reversible, verified, or confirmed (3.3.4)
- [ ] Error messages are associated with their fields using `aria-describedby` or `aria-errormessage` (3.3.1)

```tsx
<input
  id="username"
  aria-invalid={hasError}
  aria-describedby={hasError ? "username-error" : undefined}
/>
{hasError && (
  <span id="username-error" role="alert">
    Username must be at least 3 characters.
  </span>
)}
```

## Robust

### 4.1 Compatible

- [ ] HTML validates without significant parsing errors (4.1.1)
- [ ] All interactive components have accessible names and roles (4.1.2)
- [ ] Custom components use appropriate ARIA roles, states, and properties (4.1.2)
- [ ] Status messages use `role="status"` or `aria-live="polite"` so they are announced without receiving focus (4.1.3)
- [ ] Dynamic content updates are communicated to assistive technologies via live regions (4.1.3)

```tsx
// Correct: status message announced to screen readers
<div role="status" aria-live="polite">
  {isSaving ? "Saving changes..." : "All changes saved."}
</div>
```

## Review Response Guidelines

When reporting accessibility findings:
1. Reference the specific WCAG success criterion by number (e.g., 1.4.3)
2. Classify each finding as: **Blocker** (must fix before merge), **Suggestion** (should fix), or **Nit** (minor improvement)
3. Include a code example demonstrating the correct implementation
4. Note whether the issue affects keyboard, screen reader, or visual accessibility
5. Recommend testing tools such as axe-core, Lighthouse, or manual screen reader verification
