export class DurableObject<Env = unknown> {
  constructor(public ctx: any, public env: Env) {}
}
