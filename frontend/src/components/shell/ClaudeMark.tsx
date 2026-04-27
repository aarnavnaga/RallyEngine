"use client";

// Intentionally rendered as null. We don't expose model vendor names in the
// product UI per the no-model-names rule. Keeping the export so existing call
// sites compile without a sweeping edit; they can be cleaned up later.
type Props = { model?: "haiku" | "sonnet" | "opus"; size?: "xs" | "sm" };

export function ClaudeMark(_props: Props) {
  return null;
}
