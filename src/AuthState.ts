import type { User } from "oidc-client-ts";
import {
  ComputedRef,
  computed,
  provide,
  ref,
  unref,
  type InjectionKey,
} from "vue";

/**
 * The auth state which, when combined with the auth methods, make up the return object of the `useAuth` hook.
 *
 * @public
 */
export interface AuthState {
  /**
   * See [User](https://authts.github.io/oidc-client-ts/classes/User.html) for more details.
   */
  user?: User | null;

  /**
   * True when the library has been initialized and no navigator request is in progress.
   */
  isLoading: boolean;

  /**
   * True while the user has a valid access token.
   */
  isAuthenticated: boolean;

  /**
   * Tracks the status of most recent signin/signout request method.
   */
  activeNavigator?:
    | "signinRedirect"
    | "signinPopup"
    | "signinSilent"
    | "signoutRedirect"
    | "signoutPopup";

  /**
   * Was there a signin or silent renew error?
   */
  error?: Error;
}

/**
 * The initial auth state.
 */
const initialAuthState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  activeNavigator: undefined,
  error: undefined,
};

type Action =
  | { type: "INITIALISED" | "USER_LOADED"; user: User | null }
  | { type: "USER_UNLOADED" }
  | {
      type: "NAVIGATOR_INIT";
      method: NonNullable<AuthState["activeNavigator"]>;
    }
  | { type: "NAVIGATOR_CLOSE" }
  | { type: "ERROR"; error: Error };

/**
 * Handles how that state changes in the `useAuth` hook.
 */
const reducer = (state: AuthState, action: Action): AuthState => {
  switch (action.type) {
    case "INITIALISED":
    case "USER_LOADED":
      return {
        ...state,
        user: action.user,
        isLoading: false,
        isAuthenticated: action.user ? !action.user.expired : false,
        error: undefined,
      };
    case "USER_UNLOADED":
      return {
        ...state,
        user: undefined,
        isAuthenticated: false,
      };
    case "NAVIGATOR_INIT":
      return {
        ...state,
        isLoading: true,
        activeNavigator: action.method,
      };
    case "NAVIGATOR_CLOSE":
      // we intentionally don't handle cases where multiple concurrent navigators are open
      return {
        ...state,
        isLoading: false,
        activeNavigator: undefined,
      };
    case "ERROR":
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };
    default:
      return {
        ...state,
        isLoading: false,
        error: new Error(`unknown type ${action["type"] as string}`),
      };
  }
};

const state = ref(initialAuthState);

export interface AuthStateComputedRefs {
  readonly user: ComputedRef<AuthState["user"]>;
  readonly isLoading: ComputedRef<AuthState["isLoading"]>;
  readonly isAuthenticated: ComputedRef<AuthState["isAuthenticated"]>;
  readonly activeNavigator: ComputedRef<AuthState["activeNavigator"]>;
  readonly error: ComputedRef<AuthState["error"]>;
}

export const stateComputedRefs: AuthStateComputedRefs = {
  user: computed(() => state.value.user),
  isLoading: computed(() => state.value.isLoading),
  isAuthenticated: computed(() => state.value.isAuthenticated),
  activeNavigator: computed(() => state.value.activeNavigator),
  error: computed(() => state.value.error),
} as const;

export const useAuthStateReducer = () => {
  const dispatch = (action: Action) => {
    state.value = reducer(unref(state), action) as Required<AuthState>;
  };

  return [stateComputedRefs, dispatch] as const;
};

export const auth_state_key: InjectionKey<AuthStateComputedRefs> = Symbol();

export const useAuthStateProvider = (state: AuthStateComputedRefs) => {
  provide(auth_state_key, state);
};
