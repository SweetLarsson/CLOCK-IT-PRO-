/**
 * Safe fetch wrapper for authentication and API requests.
 * Prevents "Unexpected token 'T', 'The page c...' is not valid JSON" parsing crashes
 * by safely inspecting response body text, parsing JSON, handling non-JSON responses,
 * and returning clear, actionable, user-friendly error messages.
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
    
    // Read response as text first to safely inspect regardless of headers
    const rawText = await response.text();
    let parsedData: any = null;
    let isJson = false;

    if (rawText && rawText.trim().length > 0) {
      try {
        parsedData = JSON.parse(rawText);
        isJson = true;
      } catch {
        isJson = false;
      }
    }

    if (isJson && parsedData) {
      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          data: parsedData
        };
      }

      // If server returned a JSON error payload
      const extractedError = 
        parsedData.error || 
        parsedData.message || 
        parsedData.detail || 
        parsedData.msg || 
        null;

      if (extractedError && typeof extractedError === "string" && extractedError.trim().length > 0) {
        return {
          ok: false,
          status: response.status,
          data: parsedData,
          error: extractedError.trim()
        };
      }

      // Fallback message based on status code
      let statusError = `Request failed with status ${response.status}. Please check your inputs and try again.`;
      if (response.status === 401) {
        statusError = "Invalid email or password. Please verify your credentials and try again.";
      } else if (response.status === 403) {
        statusError = "Access denied. An active subscription or administrative authorization is required.";
      } else if (response.status === 404) {
        statusError = url.includes("register-worker")
          ? "The specified Company Unique ID could not be found. Please check your company code or invitation link."
          : "The requested account or company could not be found. Please check your credentials and try again.";
      } else if (response.status === 409) {
        statusError = "This email or identity is already registered in the system. Please sign in instead.";
      } else if (response.status >= 500) {
        statusError = "The server encountered a temporary condition. Please wait a few moments and try again.";
      }

      return {
        ok: false,
        status: response.status,
        data: parsedData,
        error: statusError
      };
    }

    // Non-JSON response (e.g. HTML error page from proxy, cold restart, or network gateway)
    let friendlyError = "The authentication service is temporarily unavailable or reconnecting. Please try again in a few moments.";

    if (response.status === 404) {
      if (url.includes("register-worker")) {
        friendlyError = "The specified Company Unique ID could not be verified. Please check your company code and try again.";
      } else if (url.includes("login")) {
        friendlyError = "The authentication service is temporarily reconnecting. Please wait a few moments and try again.";
      } else {
        friendlyError = "The requested service is momentarily unavailable. Please refresh and try again.";
      }
    } else if (response.status >= 500) {
      friendlyError = "The server encountered a temporary condition while processing your request. Please wait a few moments and try again.";
    } else if (rawText && rawText.length > 0 && rawText.length < 120 && !rawText.includes("<") && !rawText.includes("{")) {
      friendlyError = rawText.trim();
    }

    return {
      ok: false,
      status: response.status,
      error: friendlyError
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
