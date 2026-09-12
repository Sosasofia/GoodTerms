import { shouldRedirectFromGroupRoute } from "../src/lib/group-access";

describe("shouldRedirectFromGroupRoute", () => {
  const baseState = {
    isUserLoaded: true,
    groupsLoading: false,
    groupsError: null,
    hasGroup: false,
  };

  it("redirects a loaded user without access to the requested group", () => {
    expect(shouldRedirectFromGroupRoute(baseState)).toBe(true);
  });

  it("does not redirect while Clerk is still loading", () => {
    expect(
      shouldRedirectFromGroupRoute({
        ...baseState,
        isUserLoaded: false,
      }),
    ).toBe(false);
  });

  it("does not redirect while groups are loading", () => {
    expect(
      shouldRedirectFromGroupRoute({
        ...baseState,
        groupsLoading: true,
      }),
    ).toBe(false);
  });

  it("does not treat a groups request failure as an access denial", () => {
    expect(
      shouldRedirectFromGroupRoute({
        ...baseState,
        groupsError: "Failed to load groups.",
      }),
    ).toBe(false);
  });

  it("does not redirect a member, including a guest member", () => {
    expect(
      shouldRedirectFromGroupRoute({
        ...baseState,
        hasGroup: true,
      }),
    ).toBe(false);
  });
});
