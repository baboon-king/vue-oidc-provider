import { User, UserManager, type UserManagerSettings } from "oidc-client-ts";
import { ref, unref, watchEffect } from "vue";
import { useAuthStateReducer } from "./AuthState";
import { hasAuthParams, loginError } from "./utils";

/**
 * @public
 */
export interface AuthProviderProps extends UserManagerSettings {
  /**
   * On sign in callback hook. Can be a async function.
   * Here you can remove the code and state parameters from the url when you are redirected from the authorize page.
   *
   * ```jsx
   * const onSigninCallback = (_user: User | void): void => {
   *     window.history.replaceState(
   *         {},
   *         document.title,
   *         window.location.pathname
   *     )
   * }
   * ```
   */
  onSigninCallback?: (user: User | void) => Promise<void> | void;

  /**
   * By default, if the page url has code/state params, this provider will call automatically the userManager.signinCallback.
   * In some cases the code might be for something else (another OAuth SDK perhaps). In these
   * instances you can instruct the client to ignore them.
   *
   * ```jsx
   * <AuthProvider
   *   skipSigninCallback={window.location.pathname === '/stripe-oauth-callback'}
   * >
   * ```
   */
  skipSigninCallback?: boolean;

  /**
   * On remove user hook. Can be a async function.
   * Here you can change the url after the user is removed.
   *
   * ```jsx
   * const onRemoveUser = (): void => {
   *     // go to home after logout
   *     window.location.pathname = ""
   * }
   * ```
   */
  onRemoveUser?: () => Promise<void> | void;

  /**
   * Allow passing a custom UserManager implementation
   */
  implementation?: typeof UserManager | null;
}

const userManagerContextKeys = [
  "clearStaleState",
  "querySessionStatus",
  "revokeTokens",
  "startSilentRenew",
  "stopSilentRenew",
] as const;

const navigatorKeys = [
  "signinPopup",
  "signinSilent",
  "signinRedirect",
  "signoutPopup",
  "signoutRedirect",
] as const;

const unsupportedEnvironment = (fnName: string) => () => {
  throw new Error(
    `UserManager#${fnName} was called from an unsupported context. If this is a server-rendered page, defer this call with useEffect() or pass a custom UserManager implementation.`
  );
};

const defaultUserManagerImpl =
  typeof window === "undefined" ? null : UserManager;

export const useOidc = (options: AuthProviderProps) => {
  const {
    skipSigninCallback,
    onSigninCallback,
    onRemoveUser,
    implementation: UserManagerImpl = defaultUserManagerImpl,
    ...userManagerSettings
  } = options;

  const userManager = UserManagerImpl
    ? new UserManagerImpl(userManagerSettings)
    : ({ settings: userManagerSettings } as UserManager);

  const [state, dispatch] = useAuthStateReducer();

  const userManagerContext = {
    ...{
      settings: userManager.settings,
      events: userManager.events,
    },
    ...(Object.fromEntries(
      userManagerContextKeys.map((key) => [
        key,
        userManager[key]?.bind(userManager) ?? unsupportedEnvironment(key),
      ])
    ) as Pick<UserManager, typeof userManagerContextKeys[number]>),
    ...(Object.fromEntries(
      navigatorKeys.map((key) => [
        key,
        userManager[key]
          ? async (...args: never[]) => {
              dispatch({
                type: "NAVIGATOR_INIT",
                method: key,
              });
              try {
                return await userManager[key](...args);
              } finally {
                dispatch({ type: "NAVIGATOR_CLOSE" });
              }
            }
          : unsupportedEnvironment(key),
      ])
    ) as Pick<UserManager, typeof navigatorKeys[number]>),
  };

  const didInitialize = ref(false);

  watchEffect(async () => {
    if (!userManager || unref(didInitialize)) {
      return;
    }
    didInitialize.value = true;

    try {
      // check if returning back from authority server
      if (hasAuthParams() && !skipSigninCallback) {
        const user = await userManager.signinCallback();
        onSigninCallback && onSigninCallback(user);
      }
      const user = await userManager.getUser();
      dispatch({ type: "INITIALISED", user });
    } catch (error) {
      dispatch({ type: "ERROR", error: loginError(error) });
    }
  });

  // register to userManager events
  watchEffect(() => {
    if (!userManager) {
      return undefined;
    }
    // event UserLoaded (e.g. initial load, silent renew success)
    const handleUserLoaded = (user: User) => {
      dispatch({ type: "USER_LOADED", user });
    };

    userManager.events.addUserLoaded(handleUserLoaded);

    // event UserUnloaded (e.g. userManager.removeUser)
    const handleUserUnloaded = () => {
      dispatch({ type: "USER_UNLOADED" });
    };
    userManager.events.addUserUnloaded(handleUserUnloaded);

    // event SilentRenewError (silent renew error)
    const handleSilentRenewError = (error: Error) => {
      dispatch({ type: "ERROR", error });
    };

    userManager.events.addSilentRenewError(handleSilentRenewError);

    return () => {
      userManager.events.removeUserLoaded(handleUserLoaded);
      userManager.events.removeUserUnloaded(handleUserUnloaded);
      userManager.events.removeSilentRenewError(handleSilentRenewError);
    };
  });

  const removeUser = userManager
    ? () => userManager.removeUser().then(onRemoveUser)
    : unsupportedEnvironment("removeUser");
  const context = {
    ...userManagerContext,
    removeUser,
  };

  return {
    state,
    context,
  };
};
