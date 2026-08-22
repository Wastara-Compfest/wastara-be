export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly kode: string,
    public readonly pesan: string,
  ) {
    super(pesan);
  }

  toBody() {
    return { error: true, kode: this.kode, pesan: this.pesan };
  }
}
