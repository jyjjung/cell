/** Admin account merge field resolution (shared client + server). */
export type MergeFieldPick = 'survivor' | 'merge' | 'union' | 'eitherApproved' | 'maxProgress';

export type MergeAccountPicks = {
  firstName?: MergeFieldPick;
  lastName?: MergeFieldPick;
  email?: MergeFieldPick;
  avatar?: MergeFieldPick;
  roleIds?: MergeFieldPick;
  isApproved?: MergeFieldPick;
  access?: MergeFieldPick;
  ndcpcRole?: MergeFieldPick;
  bibleChecklist?: MergeFieldPick;
  communityProgress?: MergeFieldPick;
  contactEmails?: MergeFieldPick;
};
