/**
 * Safe fetch wrapper for authentication and API requests.
 * Prevents "Unexpected token 'T', 'The page c...' is not valid JSON" parsing crashes
 * by inspecting response content types, status codes, and network exceptions,
 * and returning structured, human-understandable error messages.
 */

export interface SafeFetchResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function safeAuthFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResponse<T>> {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type") || "";

    let parsedData: any = null;

    if (contentType.toLowerCase().includes("application/json")) {
      try {
        parsedData = await response.json();
      } catch (jsonErr: any) {
        return {
          ok: false,
          status: response.status,
          error: "The server response was not formatted as valid JSON. Please try again in a moment."
        };
      }
    } else {
      // Non-JSON response (e.g., HTML error page, proxy timeout, "The page cannot be found...")
      const text = await response.text();
      let friendlyError = "The service is temporarily unavailable or restarting. Please try again in a few moments.";

      if (response.status === 404) {
        friendlyError = "The requested service endpoint could not be found. Please refresh and try again.";
      } else if (response.status >= 500) {
        friendlyError = "The server encountered a temporary condition. Please wait a few moments and try again.";
      } else if (text && text.length > 0 && text.length < 120 && !text.includes("<") && !text.includes("{")) {
        friendlyError = text.trim();
      }

      return {
        ok: false,
        status: response.status,
        error: friendlyError
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: parsedData,
        error: parsedData?.error || `Request failed with status ${response.status}. Please check your inputs and try again.`
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsedData
    };
  } catch (err: any) {
    const msg = err?.message || "";
    const isNetwork = err?.name === "TypeError" || msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network");

    return {
      ok: false,
      status: 0,
      error: isNetwork
        ? "Unable to connect to the authentication server. Please check your network connection and try again."
        : (msg || "An unexpected error occurred while communicating with the server.")
    };
  }
}
