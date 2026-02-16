export type ParamsDecorator = (
  params: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export const noOpsParamsDecorator: ParamsDecorator = async (params) => params;
