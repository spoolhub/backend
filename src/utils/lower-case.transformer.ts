import { TransformFnParams } from 'class-transformer/types/interfaces';

export const lowerCaseTransformer = (
  params: TransformFnParams
): string | undefined =>
  typeof params.value === 'string'
    ? params.value.toLowerCase().trim()
    : undefined;
