import { User } from "oidc-client-ts";
import { inject } from "vue";
import { auth_context_key } from "./AuthContext";
import { auth_state_key } from "./AuthState";

/**
 * @public
 */
export const useAuth = () => {
  const context = inject(auth_context_key);

  const state = inject(auth_state_key);

  if (!context || !state) {
    throw new Error(
      "AuthProvider context is undefined, please verify you are calling useAuth() as child of a <AuthProvider> component."
    );
  }

  return {
    ...context,
    ...state,
  } as const;
};

/**
 * As not a child of AuthProvider. using "user" in the localStorage/sessionStorage
 * @public
 * @return return a useUser
 */
export const userGetterGen = (
  /** The URL of the OIDC/OAuth2 provider */
  authority: string,

  /** Your client application's identifier as registered with the OIDC/OAuth2 */
  clientId: string,

  /**
   * UserStorage.
   * Please keep sync to UserManagerSettings. default: sessionStorage
   */
  storage: Storage = sessionStorage
) => {
  const oidcUserStorageKey = `oidc.user:${authority}:${clientId}`;

  return () => {
    const oidcStorage = storage.getItem(oidcUserStorageKey);
    if (!oidcStorage) {
      return null;
    }
    return User.fromStorageString(oidcStorage);
  };
};
