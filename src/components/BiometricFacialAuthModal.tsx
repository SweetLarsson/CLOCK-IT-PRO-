/**
 * Biometric Facial Authentication Modal
 * Re-exports the camera biometric authentication component for backward compatibility.
 */

import BiometricCameraAuth, { BiometricCameraAuthProps } from "./BiometricCameraAuth.js";

export type { BiometricCameraAuthProps as BiometricFacialAuthModalProps };
export default BiometricCameraAuth;
