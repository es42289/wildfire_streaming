"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from "../config";

export default function Providers({ children }: { children: React.ReactNode }) {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin + "/dashboard" : "",
        audience: AUTH0_AUDIENCE,
      }}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
