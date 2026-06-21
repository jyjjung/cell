/** Account allowed to manage any member's profile photo from the members page. */
export const AVATAR_CURATOR_EMAIL = 'yejoon7154@gmail.com';

export function isAvatarCurator(email: string | null | undefined): boolean {
  return email?.toLowerCase() === AVATAR_CURATOR_EMAIL.toLowerCase();
}

/** When false, the member cannot change their own avatar from profile settings. Default: enabled. */
export function canMemberChangeOwnAvatar(
  avatarChangesEnabled: boolean | undefined,
): boolean {
  return avatarChangesEnabled !== false;
}
