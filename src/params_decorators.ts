/** Async function to decorate or transform request params before sending to Cognito (e.g. add analytics). */
export type ParamsDecorator = (
  params: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

/** No-op decorator that returns params unchanged. */
export const noOpsParamsDecorator: ParamsDecorator = async (params) => params;
