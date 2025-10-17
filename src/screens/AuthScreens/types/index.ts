export interface AccessCodeResponse {
  valid: boolean;
  role: 'admin' | 'leader' | 'member' | string;
  message?: string;
}

export interface GradientModalProps {
  visible: boolean;
  onClose: () => void;
  message: string;
}
export type RootStackParamList = {
  OtpScreen: { phone: string };
  registrationScreen: undefined;
};
export interface AccessCodeRequest {
  code: string;
}
