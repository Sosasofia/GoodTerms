export interface GroupAccessState {
  isUserLoaded: boolean;
  groupsLoading: boolean;
  groupsError: string | null;
  hasGroup: boolean;
}

export function shouldRedirectFromGroupRoute({
  isUserLoaded,
  groupsLoading,
  groupsError,
  hasGroup,
}: GroupAccessState) {
  return isUserLoaded && !groupsLoading && !groupsError && !hasGroup;
}
