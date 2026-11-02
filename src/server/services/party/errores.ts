export class PartyServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 409, code = "PARTY_CONFLICT") {
    super(message);
    this.name = "PartyServiceError";
    this.status = status;
    this.code = code;
  }
}
