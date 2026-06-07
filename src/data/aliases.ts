// Baked-in player name merges that ship with every deploy, so EVERYONE sees the
// same merged players — not just whoever linked them in their own browser.
//
// First version has no backend: the organizer opens /settings, links synonym
// names, clicks "Export for deploy", pastes the result here, and redeploys.
//
// Format: alias-as-typed -> canonical name.
export const SEED_ALIASES: Record<string, string> = {
  Oleksey: 'Oleksii',
}
