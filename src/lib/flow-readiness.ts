import type { Gender } from "./types";

export function getAddMemberDisabledReason(input: {
  firstName: string;
  lastName: string;
  gender: Gender | "";
  relativeId: string;
  hasBlockingDuplicate: boolean;
}): string | null {
  if (!input.firstName.trim()) return "First name is required.";
  if (!input.lastName.trim()) return "Last name is required.";
  if (!input.gender) return "Gender is required.";
  if (!input.relativeId) return "Choose who this person is related to.";
  if (input.hasBlockingDuplicate) return "Review the possible duplicate or choose Add anyway.";
  return null;
}

export function shouldPromptPostJoinLink(input: {
  postJoinLinkOnlyRequired: boolean;
  viewerHasDirectRelationship: boolean;
}): boolean {
  return input.postJoinLinkOnlyRequired && !input.viewerHasDirectRelationship;
}

export function shouldCommitCompositeBlur(
  currentTarget: { contains: (target: Node | null) => boolean },
  relatedTarget: Node | null
): boolean {
  return !currentTarget.contains(relatedTarget);
}
