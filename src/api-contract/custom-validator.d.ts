declare module '@aml-org/amf-custom-validator' {
  export function initialize(callback: (error?: Error) => void): void;
  export function validate(
    profile: string,
    data: string,
    debug: boolean,
    callback: (report?: string, error?: Error) => void,
  ): void;
}
