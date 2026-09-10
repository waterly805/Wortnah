# Wortnah Refero UI direction

## References reviewed

- User-selected Refero screen: Base44 **Language Games** (`412d7238-0a90-4fab-bd3d-85d1e84d1758`) for the four-choice learning layout, soft pastel tiles, and visible progress.
- August Health EHR style reference (`be1c2381-7af0-4d7c-91ca-09a715a06346`) for the spacious white canvas, warm-sand sections, strong dark text, soft 16px cards, and disciplined blue action color.

## Reference lock

Primary direction: patient-friendly learning cards on a white and warm-sand canvas.

- Preserve: large four-choice practice cards, generous spacing, rounded 16px cards, high-contrast dark text, and one blue primary action.
- Borrow only: muted peach, mint, lavender, and blue tile backgrounds from the selected Language Games screen.
- Keep colors in role: pastels identify a practice choice; blue is reserved for a clear action; dark text stays on light surfaces.
- Avoid: developer sidebars, dense controls, score gamification pressure, and decorative imagery that competes with communication.
- Accessibility: minimum large touch targets, no color-only state, clear selected state, and the existing reduced-motion support.

| Decision | Source | Why |
| --- | --- | --- |
| Four phrase cards in Üben | Base44 Language Games | Makes a practice choice clear without a crowded list. |
| Three compact progress cards | Base44 Language Games | Shows orientation without making therapy feel like a test. |
| White and warm-sand surfaces | August Health | Keeps the screen calm and readable. |
| Blue only for the next action | August Health | Preserves a clear action hierarchy. |

## 0.5.1 companion editor reference lock

The companion editor revision also reviewed Shopify's **Add product editor** (`49dc1180-3d46-423a-9233-99e0b0c993e0`) and **Adding product** flow (`5394`). The useful pattern is its grouped required fields, stable editing context, clear save action, and visible saved confirmation. Wortnah keeps its own calmer palette and larger controls.

| Decision | Source | Why |
| --- | --- | --- |
| Required German text spans the form width | Shopify Add product editor | Makes the primary content unmistakable before secondary settings. |
| Werner preview sits beside fields on wide screens | Shopify editor side rail + existing Wortnah preview | Connects the saved text to what Werner will see. |
| Save state and success appear at the editor boundary | Shopify Adding product flow | Prevents uncertain duplicate saves and confirms persistence. |
| Form and preview stack on smaller screens | Accessibility requirement | Keeps controls readable and prevents clipping on tablet and phone. |
