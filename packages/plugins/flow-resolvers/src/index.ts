import { ScalarsMap } from 'graphql-codegen-flow';
import { DocumentFile, GraphQLSchema, PluginFunction } from 'graphql-codegen-core';
import { isScalarType, parse, printSchema, visit } from 'graphql';
import { FlowResolversVisitor } from './visitor';

export interface FlowResolversPluginConfig {
  contextType?: string;
  mapping?: { [typeName: string]: string };
  scalars?: ScalarsMap;
  namingConvention?: string;
  typesPrefix?: string;
}

export const plugin: PluginFunction<FlowResolversPluginConfig> = (
  schema: GraphQLSchema,
  documents: DocumentFile[],
  config: FlowResolversPluginConfig
) => {
  const imports = ['GraphQLResolveInfo'];
  const hasScalars = Object.values(schema.getTypeMap())
    .filter(t => t.astNode)
    .some(isScalarType);

  if (hasScalars) {
    imports.push('GraphQLScalarTypeConfig');
  }

  const result = `
import { ${imports.join(', ')} } from 'graphql/type';

export type Resolver<Result, Parent = {}, Context = {}, Args = {}> = (
  parent?: Parent,
  args?: Args,
  context?: Context,
  info?: GraphQLResolveInfo
) => Promise<Result> | Result;

export type SubscriptionSubscribeFn<Result, Parent, Context, Args> = (
  parent: Parent,
  args: Args,
  context: Context,
  info: GraphQLResolveInfo
) => AsyncIterator<Result> | Promise<AsyncIterator<Result>>;

export type SubscriptionResolveFn<Result, Parent, Context, Args> = (
  parent: Parent,
  args: Args,
  context: Context,
  info: GraphQLResolveInfo
) => Result | Promise<Result>;

export interface ISubscriptionResolverObject<Result, Parent, Context, Args> {
  subscribe: SubscriptionSubscribeFn<Result, Parent, Context, Args>;
  resolve?: SubscriptionResolveFn<Result, Parent, Context, Args>;
}

export type SubscriptionResolver<Result, Parent = {}, Context = {}, Args = {}> =
  | ((...args: any[]) => ISubscriptionResolverObject<Result, Parent, Context, Args>)
  | ISubscriptionResolverObject<Result, Parent, Context, Args>;

export type TypeResolveFn<Types, Parent = {}, Context = {}> = (
  parent?: Parent,
  context?: Context,
  info?: GraphQLResolveInfo
) => ?Types;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult, TArgs = {}, TContext = {}> = (
  next?: NextResolverFn<TResult>,
  source?: any,
  args?: TArgs,
  context?: TContext,
  info?: GraphQLResolveInfo
) => TResult | Promise<TResult>;
`;

  const printedSchema = printSchema(schema);
  const astNode = parse(printedSchema);
  const visitorResult = visit(astNode, {
    leave: new FlowResolversVisitor(config, schema)
  });

  return result + '\n' + visitorResult.definitions.filter(d => typeof d === 'string').join('\n');
};
